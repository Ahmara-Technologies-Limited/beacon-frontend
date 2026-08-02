import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, MapPin, Tag, SlidersHorizontal, Layers, Trash2, Edit3, X, ChevronRight, User, ArrowLeft } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { formatBudget } from '../lib/format';

export default function PropertyManagement({ currentUser }) {
  const [properties, setProperties] = useState([]);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedProperty, setSelectedProperty] = useState(null);
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState({
    id: '',
    name: '',
    type: 'Estate Plot',
    location: '',
    totalUnits: 10,
    availableUnits: 10,
    price: '',
    status: 'Selling',
    description: '',
    amenities: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const loadData = async () => {
    const [props, leadsList] = await Promise.all([dataService.getProperties(), db.getLeads()]);
    setProperties(props);
    setLeads(leadsList);
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenCreateModal = () => {
    setModalData({
      id: '',
      name: '',
      type: 'Estate Plot',
      location: '',
      totalUnits: 10,
      availableUnits: 10,
      price: '',
      status: 'Selling',
      description: '',
      amenities: ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEditModal = (e, prop) => {
    e.stopPropagation();
    setModalData({
      id: prop.id,
      name: prop.name,
      type: prop.type,
      location: prop.location,
      totalUnits: prop.totalUnits,
      availableUnits: prop.availableUnits,
      price: prop.price,
      status: prop.status,
      description: prop.description || '',
      amenities: prop.amenities ? prop.amenities.join(', ') : ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleDeleteProperty = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this property? This action is permanent.")) {
      await dataService.deleteProperty(id);
      await loadData();
      if (selectedProperty?.id === id) {
        setSelectedProperty(null);
      }
    }
  };

  const validate = () => {
    const errs = {};
    if (!modalData.name.trim()) errs.name = "Property name is required.";
    if (!modalData.location.trim()) errs.location = "Location is required.";
    if (!modalData.price || isNaN(Number(modalData.price)) || Number(modalData.price) <= 0) {
      errs.price = "Enter a valid positive price.";
    }
    if (isNaN(Number(modalData.totalUnits)) || Number(modalData.totalUnits) < 0) {
      errs.totalUnits = "Enter a valid total units count.";
    }
    if (isNaN(Number(modalData.availableUnits)) || Number(modalData.availableUnits) < 0 || Number(modalData.availableUnits) > Number(modalData.totalUnits)) {
      errs.availableUnits = "Available units cannot exceed total units.";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveProperty = async () => {
    if (!validate()) return;

    const payload = {
      id: modalData.id || undefined,
      name: modalData.name.trim(),
      type: modalData.type,
      location: modalData.location.trim(),
      totalUnits: Number(modalData.totalUnits),
      availableUnits: Number(modalData.availableUnits),
      price: Number(modalData.price),
      status: modalData.status,
      description: modalData.description.trim(),
      amenities: modalData.amenities ? modalData.amenities.split(',').map(s => s.trim()).filter(Boolean) : []
    };

    await dataService.saveProperty(payload);
    await loadData();
    setModalOpen(false);
  };

  // Filter properties
  const getFilteredProperties = () => {
    let result = properties;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.location.toLowerCase().includes(q)
      );
    }

    if (filterType !== 'All') {
      result = result.filter(p => p.type === filterType);
    }

    if (filterStatus !== 'All') {
      result = result.filter(p => p.status === filterStatus);
    }

    return result;
  };

  const filteredProps = getFilteredProperties();
  const propertyTypes = Array.from(new Set(properties.map(p => p.type)));

  // Get allocations (leads interested or allocated to this property)
  const getAllocations = (prop) => {
    if (!prop) return [];
    // Match by lead interest (starts with property name or contains it)
    return leads.filter(l => {
      const stageOrder = ['Reservation', 'Payment', 'Documentation', 'Allocation', 'Client/Investor'];
      const isAllocatedStage = stageOrder.includes(l.stage);
      
      const interestMatches = l.propertyInterest && l.propertyInterest.toLowerCase().includes(prop.name.toLowerCase());
      const idMatches = l.propertyId === prop.id;
      
      return isAllocatedStage && (interestMatches || idMatches);
    });
  };

  const selectedAllocations = selectedProperty ? getAllocations(selectedProperty) : [];

  const formatPrice = (val) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(val);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Selling': return 'badge-success';
      case 'Sold Out': return 'badge-grey';
      case 'Planned': return 'badge-cold';
      default: return 'badge-grey';
    }
  };

  const isEditable = currentUser.role === 'Super Admin' || currentUser.role === 'Admin/Doc Officer';

  const getLeadCount = (prop) => {
    return leads.filter(l => {
      const interestMatches = l.propertyInterest && l.propertyInterest.toLowerCase().includes(prop.name.toLowerCase());
      const idMatches = l.propertyId === prop.id;
      return interestMatches || idMatches;
    }).length;
  };

  return (
    <div className="property-mgmt-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Property Management</span>
      </div>

      {selectedProperty ? (
        /* Detailed Property Page View */
        <div className="property-detail-page animate-slide">
          <button className="btn btn-sm back-nav-btn" onClick={() => setSelectedProperty(null)} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={16} />
            <span>Back to Properties Table</span>
          </button>

          <div className="card" style={{ padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px', marginBottom: '20px' }}>
              <div>
                <span className={`badge ${getStatusClass(selectedProperty.status)}`} style={{ marginBottom: '8px' }}>{selectedProperty.status}</span>
                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{selectedProperty.name}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                  <MapPin size={14} />
                  <span>{selectedProperty.location}</span>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--color-grey-bg)', padding: '4px 12px', borderRadius: '4px', display: 'inline-block', marginBottom: '8px' }}>{selectedProperty.type}</span>
                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary-red)' }}>{formatPrice(selectedProperty.price)}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gap: '32px' }} className="responsive-details-grid">
              <div>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-placeholder)', textTransform: 'uppercase', marginBottom: '8px' }}>Property Description</h4>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>{selectedProperty.description || 'No description provided.'}</p>

                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-placeholder)', textTransform: 'uppercase', marginBottom: '10px' }}>Estate Amenities</h4>
                {selectedProperty.amenities && selectedProperty.amenities.length > 0 ? (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    {selectedProperty.amenities.map(a => (
                      <span key={a} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', background: 'var(--color-grey-bg)', padding: '6px 12px', borderRadius: '6px' }}>{a}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>No amenities specified.</p>
                )}

                <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>Interested & Allocated Leads ({selectedAllocations.length})</h3>
                {selectedAllocations.length === 0 ? (
                  <div style={{ padding: '24px', background: 'var(--color-grey-bg)', borderRadius: '8px', fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    No active bookings, allocations, or payments logged against this property.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="custom-table" style={{ background: 'var(--color-grey-bg)' }}>
                      <thead>
                        <tr>
                          <th>Lead Name</th>
                          <th>Stage</th>
                          <th>Budget</th>
                          <th>Phone</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAllocations.map(lead => (
                          <tr key={lead.id}>
                            <td style={{ fontWeight: 700 }}>{lead.name}</td>
                            <td><span className="badge badge-grey">{lead.stage}</span></td>
                            <td style={{ fontWeight: 700, color: 'var(--primary-red)' }}>{formatBudget(lead.budget)}</td>
                            <td>{lead.phone}</td>
                            <td>{lead.email || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: '20px', backgroundColor: '#FAFAFA', height: 'fit-content' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>Inventory Allocation</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Total Units</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedProperty.totalUnits}</strong>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Available Inventory</span>
                    <strong style={{ color: 'var(--color-success-text)' }}>{selectedProperty.availableUnits} units</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Allocated Units</span>
                    <strong style={{ color: 'var(--primary-red)' }}>{selectedProperty.totalUnits - selectedProperty.availableUnits} units</strong>
                  </div>

                  <div style={{ marginTop: '8px' }}>
                    <div style={{ width: '100%', height: '8px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${((selectedProperty.totalUnits - selectedProperty.availableUnits) / selectedProperty.totalUnits) * 100}%`, height: '100%', background: 'var(--primary-red)' }} />
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '6px', textAlign: 'right', fontWeight: 600 }}>
                      {(((selectedProperty.totalUnits - selectedProperty.availableUnits) / selectedProperty.totalUnits) * 100).toFixed(0)}% Allocated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Properties Table View */
        <>
          <div className="page-header-row">
            <div>
              <h1 className="page-title">Property Management</h1>
              <p className="page-subtitle">Manage listings, track inventory allocation, and configure project brochures.</p>
            </div>
            {isEditable && (
              <button className="btn btn-primary" onClick={handleOpenCreateModal}>
                <Plus size={16} />
                <span>Add Property</span>
              </button>
            )}
          </div>

          <div className="property-toolbar card" style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', padding: '16px 20px' }}>
            <div className="search-container" style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={18} className="search-icon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)' }} />
              <input 
                type="text" 
                placeholder="Search by property name, location..." 
                className="form-control"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '38px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="filter-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Type:</span>
                <select className="form-control" style={{ padding: '6px 10px', minWidth: '130px', fontSize: '13px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="All">All Types</option>
                  {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="filter-label" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
                <select className="form-control" style={{ padding: '6px 10px', minWidth: '130px', fontSize: '13px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="All">All Statuses</option>
                  <option value="Selling">Selling</option>
                  <option value="Sold Out">Sold Out</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Property Name</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Price</th>
                    <th>Total Units</th>
                    <th>Available Units</th>
                    <th>Lead Count</th>
                    <th>Status</th>
                    {isEditable && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredProps.length === 0 ? (
                    <tr>
                      <td colSpan={isEditable ? 9 : 8} className="empty-table-state">
                        No properties found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredProps.map(prop => {
                      const count = getLeadCount(prop);
                      return (
                        <tr key={prop.id} onClick={() => setSelectedProperty(prop)} style={{ cursor: 'pointer' }}>
                          <td style={{ fontWeight: 700 }} className="lead-name-cell">{prop.name}</td>
                          <td><span className="badge badge-grey">{prop.type}</span></td>
                          <td>{prop.location}</td>
                          <td style={{ fontWeight: 700, color: 'var(--primary-red)' }}>{formatPrice(prop.price)}</td>
                          <td>{prop.totalUnits}</td>
                          <td style={{ fontWeight: 600, color: 'var(--color-success-text)' }}>{prop.availableUnits}</td>
                          <td>
                            <span className="badge" style={{ backgroundColor: 'rgba(212, 38, 42, 0.1)', color: 'var(--primary-red)', fontWeight: 'bold', minWidth: '24px', textAlign: 'center', display: 'inline-block', padding: '2px 6px' }}>
                              {count}
                            </span>
                          </td>
                          <td><span className={`badge ${getStatusClass(prop.status)}`}>{prop.status}</span></td>
                          {isEditable && (
                            <td onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '4px' }}>
                                <button className="btn btn-sm" style={{ padding: '4px 8px' }} onClick={(e) => handleOpenEditModal(e, prop)}>
                                  <Edit3 size={12} />
                                </button>
                                <button className="btn btn-sm btn-danger" style={{ padding: '4px 8px' }} onClick={(e) => handleDeleteProperty(e, prop.id)}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{modalData.id ? 'Edit Property Listing' : 'Add Property Listing'}</h3>
              <button className="modal-close" onClick={() => setModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Property Name *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={modalData.name} 
                  onChange={e => setModalData({ ...modalData, name: e.target.value })} 
                  placeholder="e.g. Beacon Waterfront, Lekki" 
                />
                {formErrors.name && <span className="form-error">{formErrors.name}</span>}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Property Type</label>
                  <select 
                    className="form-control" 
                    value={modalData.type} 
                    onChange={e => setModalData({ ...modalData, type: e.target.value })}
                  >
                    <option value="Estate Plot">Estate Plot</option>
                    <option value="Land">Land</option>
                    <option value="2 Bedroom Duplex">2 Bedroom Duplex</option>
                    <option value="3 Bedroom Penthouse">3 Bedroom Penthouse</option>
                    <option value="4 Bedroom Terrace">4 Bedroom Terrace</option>
                    <option value="5 Bedroom Duplex">5 Bedroom Duplex</option>
                    <option value="6 Bedroom Mansion">6 Bedroom Mansion</option>
                    <option value="Commercial Space">Commercial Space</option>
                  </select>
                </div>

                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                  <label className="form-label">Status</label>
                  <select 
                    className="form-control" 
                    value={modalData.status}
                    onChange={e => setModalData({ ...modalData, status: e.target.value })}
                  >
                    <option value="Selling">Selling</option>
                    <option value="Sold Out">Sold Out</option>
                    <option value="Planned">Planned</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Location Address *</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={modalData.location} 
                  onChange={e => setModalData({ ...modalData, location: e.target.value })} 
                  placeholder="e.g. Lekki Phase 1, Lagos" 
                />
                {formErrors.location && <span className="form-error">{formErrors.location}</span>}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1.2, marginBottom: 0 }}>
                  <label className="form-label">Price (NGN) *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={modalData.price} 
                    onChange={e => setModalData({ ...modalData, price: e.target.value })} 
                    placeholder="e.g. 50000000" 
                  />
                  {formErrors.price && <span className="form-error">{formErrors.price}</span>}
                </div>

                <div className="form-group" style={{ flex: 0.8, marginBottom: 0 }}>
                  <label className="form-label">Total Units *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={modalData.totalUnits} 
                    onChange={e => setModalData({ ...modalData, totalUnits: e.target.value })} 
                  />
                  {formErrors.totalUnits && <span className="form-error">{formErrors.totalUnits}</span>}
                </div>

                <div className="form-group" style={{ flex: 0.8, marginBottom: 0 }}>
                  <label className="form-label">Available Units *</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={modalData.availableUnits} 
                    onChange={e => setModalData({ ...modalData, availableUnits: e.target.value })} 
                  />
                  {formErrors.availableUnits && <span className="form-error">{formErrors.availableUnits}</span>}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  value={modalData.description} 
                  onChange={e => setModalData({ ...modalData, description: e.target.value })} 
                  placeholder="Describe property features, access roads, utilities..."
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Amenities (Comma separated tags)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={modalData.amenities} 
                  onChange={e => setModalData({ ...modalData, amenities: e.target.value })} 
                  placeholder="e.g. 24/7 Power, Perimeter Fence, Smart Security" 
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveProperty}>Save Listing</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .responsive-details-grid {
          grid-template-columns: 2fr 1fr;
        }

        @media (max-width: 1024px) {
          .responsive-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
