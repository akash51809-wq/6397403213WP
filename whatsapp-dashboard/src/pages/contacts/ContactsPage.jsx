import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'
import '../../styles/contacts.css'

export function ContactsPage() {
  const navigate = useNavigate()
  const { notify } = useAuth()

  const [contacts, setContacts] = useState([])
  const [contactGroups, setContactGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)

  // Form State for Contact
  const [formName, setFormName] = useState('')
  const [formMobile, setFormMobile] = useState('')
  const [formGroup, setFormGroup] = useState('General')
  const [formType, setFormType] = useState('Customer')
  const [formStatus, setFormStatus] = useState('Active')
  const [formEmail, setFormEmail] = useState('')

  // Form State for New Group
  const [newGroupName, setNewGroupName] = useState('')

  // Fetch contacts and contact groups from Database
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [cntRes, grpRes] = await Promise.all([
        api('/api/contacts'),
        api('/api/contact-groups')
      ])
      if (cntRes.success) {
        setContacts(cntRes.contacts || [])
      }
      if (grpRes.success) {
        setContactGroups(grpRes.groups || [])
      }
    } catch (e) {
      console.error('Error loading contacts:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Filter contacts by selectedGroup and searchQuery
  const filteredContacts = contacts.filter(c => {
    const matchesGroup = selectedGroup === 'All' || (c.group && c.group.toLowerCase() === selectedGroup.toLowerCase())
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch = !q || 
      (c.name && c.name.toLowerCase().includes(q)) || 
      (c.mobile && c.mobile.toLowerCase().includes(q)) ||
      (c.cleanNumber && c.cleanNumber.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    return matchesGroup && matchesSearch
  })

  // Create new contact
  const handleAddContact = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      notify('Please enter contact name', 'warning')
      return
    }
    const cleanNum = formMobile.replace(/\D/g, '').slice(-10)
    if (!cleanNum || cleanNum.length < 10) {
      notify('Please enter a valid 10-digit mobile number', 'warning')
      return
    }

    try {
      const res = await api('/api/contacts', {
        method: 'POST',
        body: JSON.stringify({
          name: formName.trim(),
          mobile: cleanNum,
          group: formGroup || 'General',
          type: formType,
          status: formStatus,
          email: formEmail.trim()
        })
      })

      if (res.success) {
        notify('Contact added successfully!')
        setShowAddModal(false)
        setFormName('')
        setFormMobile('')
        setFormEmail('')
        setFormGroup('General')
        setFormType('Customer')
        loadData()
      } else {
        notify(res.message || 'Failed to add contact', 'error')
      }
    } catch (err) {
      notify(err.message || 'Failed to add contact', 'error')
    }
  }

  // Delete contact
  const handleDeleteContact = async (id) => {
    try {
      const res = await api(`/api/contacts/${id}`, { method: 'DELETE' })
      if (res.success) {
        notify('Contact removed')
        setSelectedContact(null)
        setContacts(prev => prev.filter(c => c.id !== id))
        loadData()
      } else {
        notify(res.message || 'Failed to delete contact', 'error')
      }
    } catch (err) {
      notify(err.message || 'Failed to delete contact', 'error')
    }
  }

  // Create new contact group
  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!newGroupName.trim()) {
      notify('Please enter group name', 'warning')
      return
    }
    try {
      const res = await api('/api/contact-groups', {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim() })
      })
      if (res.success) {
        notify(`Contact group "${newGroupName.trim()}" created!`)
        setNewGroupName('')
        setShowGroupModal(false)
        loadData()
      } else {
        notify(res.message || 'Failed to create group', 'error')
      }
    } catch (err) {
      notify(err.message || 'Failed to create group', 'error')
    }
  }

  // Delete contact group
  const handleDeleteGroup = async (groupName) => {
    if (!window.confirm(`Are you sure you want to delete group "${groupName}"? Contacts will be moved to "General".`)) {
      return
    }
    try {
      const res = await api(`/api/contact-groups/${encodeURIComponent(groupName)}`, { method: 'DELETE' })
      if (res.success) {
        notify(`Group "${groupName}" deleted`)
        if (selectedGroup === groupName) setSelectedGroup('All')
        loadData()
      } else {
        notify(res.message || 'Failed to delete group', 'error')
      }
    } catch (err) {
      notify(err.message || 'Failed to delete group', 'error')
    }
  }

  // Direct action: Send Message to Contact
  const handleSendMessageToContact = (contact) => {
    if (contact.cleanNumber) {
      sessionStorage.setItem('groupSelectedNumbers', contact.cleanNumber)
      notify(`Selected ${contact.name}! Navigating to composer...`)
      navigate('/send')
    } else {
      notify('Cannot message this contact (invalid number)', 'warning')
    }
  }

  // Direct action: Send Message to entire Group
  const handleSendToGroup = (groupName) => {
    const groupContacts = contacts.filter(c => c.group && c.group.toLowerCase() === groupName.toLowerCase())
    const numbers = groupContacts.map(c => c.cleanNumber).filter(Boolean)
    if (numbers.length === 0) {
      notify(`No valid mobile numbers in group "${groupName}".`, 'warning')
      return
    }
    sessionStorage.setItem('groupSelectedNumbers', numbers.join(', '))
    notify(`Selected ${numbers.length} numbers from group "${groupName}"! Navigating to composer...`)
    navigate('/send')
  }

  const getInitials = (name) => {
    return (name || 'CT')
      .split(' ')
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'CT'
  }

  const activeContactsCount = contacts.filter(c => c.status === 'Active').length
  const customerCount = contacts.filter(c => c.type === 'Customer').length

  return (
    <div className="content contacts-container">
      {/* Hero */}
      <div className="hero">
        <div>
          <span className="eyebrow">CONTACT MANAGEMENT</span>
          <h1>Contacts</h1>
          <p>Manage customer contacts, contact groups and WhatsApp numbers (Database Live)</p>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid4">
        <article className="stat">
          <small>Total Contacts</small>
          <strong>{contacts.length.toLocaleString('en-IN')}</strong>
          <span>Saved</span>
        </article>
        <article className="stat">
          <small>Contact Groups</small>
          <strong>{contactGroups.length.toLocaleString('en-IN')}</strong>
          <span>Categories</span>
        </article>
        <article className="stat">
          <small>Active Contacts</small>
          <strong>{activeContactsCount.toLocaleString('en-IN')}</strong>
          <span>Verified</span>
        </article>
        <article className="stat">
          <small>Customers</small>
          <strong>{customerCount.toLocaleString('en-IN')}</strong>
          <span>Direct</span>
        </article>
      </div>

      {/* Contact Directory Card */}
      <article className="card table-card">
        <div className="card-head">
          <div>
            <h3>Contact Directory</h3>
            <p>Customer directory with multi-group broadcast support.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button 
              type="button" 
              className="btn"
              onClick={() => setShowGroupModal(true)}
              style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', borderColor: 'rgba(99, 102, 241, 0.3)' }}
            >
              📁 Manage Groups
            </button>
            <button 
              type="button" 
              className="btn primary"
              onClick={() => setShowAddModal(true)}
            >
              ＋ Add Contact
            </button>
          </div>
        </div>

        {/* Toolbar & Group Pills */}
        <div className="contacts-toolbar">
          <div className="contacts-search-box">
            <span>⌕</span>
            <input 
              type="text" 
              placeholder="Search by name, number, email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="contacts-filter-pills" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button
              type="button"
              className={`contact-pill ${selectedGroup === 'All' ? 'active' : ''}`}
              onClick={() => setSelectedGroup('All')}
            >
              All ({contacts.length})
            </button>
            {contactGroups.map(grp => (
              <button
                key={grp.name}
                type="button"
                className={`contact-pill ${selectedGroup === grp.name ? 'active' : ''}`}
                onClick={() => setSelectedGroup(grp.name)}
              >
                {grp.name} ({grp.count})
              </button>
            ))}
          </div>

          {selectedGroup !== 'All' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
              <button
                type="button"
                className="btn primary"
                style={{ fontSize: 12, padding: '4px 12px' }}
                onClick={() => handleSendToGroup(selectedGroup)}
                title={`Send WhatsApp message to all contacts in "${selectedGroup}"`}
              >
                ↗ Send Message to "{selectedGroup}" Group
              </button>
            </div>
          )}
        </div>

        {/* Contacts Table */}
        <div className="table-wrap">
          <table className="table contacts-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Mobile Number</th>
                <th>Group</th>
                <th>Type</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#718078' }}>
                    Loading contacts...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#718078' }}>
                    No contacts found. Click "＋ Add Contact" to add your first customer.
                  </td>
                </tr>
              ) : (
                filteredContacts.map(contact => (
                  <tr key={contact.id}>
                    <td>
                      <div className="contact-name-cell">
                        <span className="contact-avatar">
                          {getInitials(contact.name)}
                        </span>
                        <div>
                          <b>{contact.name}</b>
                          {contact.email && <small style={{ display: 'block', color: '#64748b' }}>{contact.email}</small>}
                        </div>
                      </div>
                    </td>
                    <td>{contact.mobile || (contact.cleanNumber ? `+91 ${contact.cleanNumber}` : '—')}</td>
                    <td>
                      <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        {contact.group || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`contact-type-tag ${(contact.type || 'customer').toLowerCase()}`}>
                        {contact.type || 'Customer'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${contact.status === 'Active' ? 'success' : 'pending'}`}>
                        {contact.status || 'Active'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          type="button" 
                          className="btn btn-view-contact"
                          onClick={() => setSelectedContact(contact)}
                          style={{ padding: '3px 8px', fontSize: 11 }}
                        >
                          View
                        </button>
                        {contact.cleanNumber && (
                          <button 
                            type="button" 
                            className="btn primary"
                            onClick={() => handleSendMessageToContact(contact)}
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            title="Send WhatsApp message"
                          >
                            ↗ Send
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </article>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>＋ Add New Contact</h3>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setShowAddModal(false)}
                style={{ border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddContact}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="field">
                  <label>Full Name *</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="e.g. Rahul Sharma" 
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>WhatsApp Mobile Number (10 Digits) *</label>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ padding: '8px 12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRight: 'none', borderRadius: '8px 0 0 8px', color: '#64748b', fontWeight: 600 }}>+91</span>
                    <input 
                      type="tel" 
                      className="input" 
                      placeholder="9876543210" 
                      value={formMobile}
                      maxLength="10"
                      onChange={e => setFormMobile(e.target.value.replace(/\D/g, ''))}
                      style={{ borderRadius: '0 8px 8px 0' }}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label>Contact Group</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select 
                      className="select"
                      value={formGroup}
                      onChange={e => setFormGroup(e.target.value)}
                    >
                      <option value="General">General</option>
                      {contactGroups.map(g => (
                        <option key={g.name} value={g.name}>{g.name}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      className="input" 
                      placeholder="Or type new group..." 
                      value={formGroup === 'General' ? '' : formGroup}
                      onChange={e => setFormGroup(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="field">
                    <label>Contact Type</label>
                    <select 
                      className="select"
                      value={formType}
                      onChange={e => setFormType(e.target.value)}
                    >
                      <option value="Customer">Customer</option>
                      <option value="Lead">Lead</option>
                      <option value="Vendor">Vendor</option>
                      <option value="VIP">VIP</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>Status</label>
                    <select 
                      className="select"
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Blocked">Blocked</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label>Email / Note (Optional)</label>
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="e.g. rahul@example.com" 
                    value={formEmail}
                    onChange={e => setFormEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn primary"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Contact Groups Modal */}
      {showGroupModal && (
        <div className="modal-overlay" onClick={() => setShowGroupModal(false)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3>📁 Contact Groups</h3>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setShowGroupModal(false)}
                style={{ border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <form onSubmit={handleCreateGroup} style={{ display: 'flex', gap: 8 }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="New group name (e.g. Suppliers, VIP, Staff)..." 
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn primary" style={{ whiteSpace: 'nowrap' }}>
                  ＋ Add Group
                </button>
              </form>

              <div>
                <strong style={{ fontSize: 13, color: '#475569', display: 'block', marginBottom: 8 }}>Existing Groups</strong>
                {contactGroups.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: 13 }}>No groups created yet. Group "General" is default.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {contactGroups.map(grp => (
                      <div 
                        key={grp.name} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0'
                        }}
                      >
                        <div>
                          <strong>{grp.name}</strong>
                          <span style={{ fontSize: 12, color: '#64748b', marginLeft: 8 }}>({grp.count} contacts)</span>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button 
                            type="button" 
                            className="btn primary" 
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => {
                              setShowGroupModal(false)
                              handleSendToGroup(grp.name)
                            }}
                          >
                            ↗ Send Msg
                          </button>
                          {grp.name.toLowerCase() !== 'general' && (
                            <button 
                              type="button" 
                              className="btn" 
                              style={{ padding: '2px 8px', fontSize: 11, color: '#ef4444', borderColor: '#fca5a5' }}
                              onClick={() => handleDeleteGroup(grp.name)}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn" 
                onClick={() => setShowGroupModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Contact Modal */}
      {selectedContact && (
        <div className="modal-overlay" onClick={() => setSelectedContact(null)}>
          <div className="modal-content-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className="contact-avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                  {getInitials(selectedContact.name)}
                </span>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedContact.name}</h3>
                  <small style={{ color: '#718078', fontWeight: 600 }}>
                    {selectedContact.group || 'General'} · {selectedContact.type} · {selectedContact.status}
                  </small>
                </div>
              </div>
              <button 
                type="button" 
                className="icon-btn" 
                onClick={() => setSelectedContact(null)}
                style={{ border: 'none', background: 'transparent' }}
              >
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f6f4ec', padding: 14, borderRadius: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <small style={{ color: '#718078', fontSize: 11, fontWeight: 700 }}>PHONE / NUMBER</small>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#183126', marginTop: 2 }}>
                    {selectedContact.mobile || (selectedContact.cleanNumber ? `+91 ${selectedContact.cleanNumber}` : '—')}
                  </div>
                </div>
                {selectedContact.email && (
                  <div>
                    <small style={{ color: '#718078', fontSize: 11, fontWeight: 700 }}>EMAIL / INFO</small>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#183126', marginTop: 2 }}>{selectedContact.email}</div>
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#718078' }}>
                Group: <strong>{selectedContact.group || 'General'}</strong>
                {selectedContact.addedDate && <span> · Added on: <strong>{selectedContact.addedDate}</strong></span>}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ color: '#e85b63', borderColor: 'rgba(232, 91, 99, 0.3)' }}
                onClick={() => handleDeleteContact(selectedContact.id)}
              >
                Delete
              </button>

              <div style={{ display: 'flex', gap: 8 }}>
                {selectedContact.cleanNumber && (
                  <button 
                    type="button" 
                    className="btn primary"
                    onClick={() => handleSendMessageToContact(selectedContact)}
                  >
                    Send Message ↗
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn" 
                  onClick={() => setSelectedContact(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContactsPage
