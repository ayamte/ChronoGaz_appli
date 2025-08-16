import React, { useState, useEffect, useCallback, useRef } from 'react';    
import {    
  MdSearch as Search,    
  MdFilterList as Filter,    
  MdVisibility as Eye,    
  MdLocalShipping as TruckIcon,    
  MdPhone as Phone,    
  MdSmartphone as Smartphone,    
  MdDescription as ClipboardList,    
  MdRefresh as Refresh,    
  MdWarning as AlertTriangle,    
  MdCheckCircle as CheckCircle,    
  MdAccessTime as Clock,    
  MdClose as X,    
  MdInventory as Package     
} from 'react-icons/md';    
    
import { orderService } from '../../../services/orderService';    
import { authService } from '../../../services/authService';    
import SidebarNavigation from '../../../components/admin/Sidebar/Sidebar';    
import './OrderManagement.css';    
    
import LoadingSpinner from '../../../components/common/LoadingSpinner';    
import Pagination from '../../../components/common/Pagination';    
import OrderDetailsModal from './OrderDetailsModal';    
import TruckAssignmentModal from './TruckAssignmentModal';    
    
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';    
    
const OrderManagement = () => {    
  // États locaux pour les données    
  const [orders, setOrders] = useState([]);    
  const [trucks, setTrucks] = useState([]);    
      
  // États de chargement    
  const [loading, setLoading] = useState(true);    
  const [trucksLoading, setTrucksLoading] = useState(false);    
      
  // États d'erreur    
  const [error, setError] = useState('');    
  const [notification, setNotification] = useState(null);    
    
  // États pour les filtres et modales    
  const [filters, setFilters] = useState({    
    search: '',    
    status: 'pending',    
    priority: 'all',    
    dateFrom: '',    
    date: ''    
  });    
      
  const [selectedOrder, setSelectedOrder] = useState(null);    
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);    
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);    
      
  // Pagination    
  const [pagination, setPagination] = useState({    
    page: 1,    
    limit: 20,    
    total: 0,    
    totalPages: 0    
  });    
      
  // Statistiques    
  const [stats, setStats] = useState({    
    total: 0,    
    pending: 0,    
    assigned: 0,    
    inProgress: 0,    
    delivered: 0    
  });    
    
  // Refs pour la gestion des timeouts    
  const searchTimeoutRef = useRef(null);    
  const isMountedRef = useRef(true);    
    
  // Fonction pour afficher les notifications    
  const showNotification = useCallback((message, type = 'info') => {    
    setNotification({ message, type });    
    setTimeout(() => setNotification(null), 5000);    
  }, []);    
    
  const hideNotification = useCallback(() => {    
    setNotification(null);    
  }, []);    
    
  // ✅ MODIFIÉ: Utiliser le nouveau orderService  
  const fetchOrders = useCallback(async (currentFilters = null, currentPage = null) => {  
    if (!isMountedRef.current) return;  
          
    try {  
      setLoading(true);  
      setError('');  
            
      const filtersToUse = currentFilters || filters;  
      const pageToUse = currentPage || pagination.page;  
        
      console.log('🔍 [DEBUG] Filtres appliqués:', filtersToUse);  
        
      // 🔧 FORCÉ: Toujours filtrer sur pending uniquement  
      const statusFilter = 'pending';  
        
      // 🔧 MODIFIÉ: Logique pour filtrer par date du jour  
      let dateFromFilter, dateToFilter;  
      if (filtersToUse.date) {  
        const selectedDate = new Date(filtersToUse.date);  
        dateFromFilter = new Date(selectedDate.setHours(0, 0, 0, 0)).toISOString();  
        dateToFilter = new Date(selectedDate.setHours(23, 59, 59, 999)).toISOString();  
        console.log('📅 [DEBUG] Plage de dates:', { dateFromFilter, dateToFilter });  
      }  
            
      const response = await orderService.getOrders({  
        page: pageToUse,  
        limit: pagination.limit,  
        search: filtersToUse.search,  
        status: statusFilter, // Toujours pending  
        // 🔧 SUPPRIMÉ: Ne pas envoyer priority à l'API  
        // priority: filtersToUse.priority === 'all' ? undefined : filtersToUse.priority,  
        dateFrom: dateFromFilter,  
        dateTo: dateToFilter  
      });  
    
      console.log('📊 [DEBUG] Réponse API:', response);  
    
      if (isMountedRef.current) {  
        let filteredData = response.data || [];  
          
        // 🔧 NOUVEAU: Appliquer le filtre de priorité côté client  
        if (filtersToUse.priority && filtersToUse.priority !== 'all') {  
          filteredData = filteredData.filter((order) => {  
            return order.priority === filtersToUse.priority;  
          });  
          console.log('🔍 [DEBUG] Après filtre priorité:', filteredData.length);  
        }  
          
        setOrders(filteredData);  
        setPagination(prev => ({  
          ...prev,  
          page: pageToUse,  
          total: filteredData.length, // Ajuster le total après filtrage client  
          totalPages: Math.ceil(filteredData.length / pagination.limit)  
        }));  
          
        console.log('✅ [DEBUG] Données finales:', filteredData.length, 'commandes');  
      }  
    } catch (err) {  
      console.error('💥 [ERROR] Erreur lors du chargement des commandes:', err);  
      if (isMountedRef.current) {  
        setError(err.message);  
        showNotification('Erreur lors du chargement des commandes', 'error');  
      }  
    } finally {  
      if (isMountedRef.current) {  
        setLoading(false);  
      }  
    }  
  }, [filters, pagination.page, pagination.limit, showNotification]);
    
  // ✅ MODIFIÉ: Chargement des camions simplifié  
  const fetchTrucks = useCallback(async () => {    
    try {    
      setTrucksLoading(true);    
      const token = authService.getToken();    
      const response = await fetch(`${API_BASE_URL}/api/trucks`, {    
        headers: {    
          'Authorization': `Bearer ${token}`,    
          'Content-Type': 'application/json'    
        }    
      });    
      
      if (response.ok) {    
        const data = await response.json();    
        if (data.success) {    
          const transformedTrucks = data.data.map(truck => ({    
            id: truck._id,    
            plateNumber: truck.matricule,    
            model: `${truck.brand} ${truck.modele}`,  
            capacity: truck.capacite,    
            status: truck.status,  
            driver: truck.driver ? {    
              id: truck.driver._id,    
              name: truck.driver.physical_user_id     
                ? `${truck.driver.physical_user_id.first_name} ${truck.driver.physical_user_id.last_name}`    
                : 'Non assigné'    
            } : null,    
            accompagnant: truck.accompagnant ? {    
              id: truck.accompagnant._id,    
              name: truck.accompagnant.physical_user_id     
                ? `${truck.accompagnant.physical_user_id.first_name} ${truck.accompagnant.physical_user_id.last_name}`    
                : 'Non assigné'    
            } : null    
          }));    
          setTrucks(transformedTrucks);    
        }    
      }    
    } catch (err) {    
      console.error('Erreur lors du chargement des camions:', err);    
    } finally {    
      setTrucksLoading(false);    
    }    
  }, []);   
    
  // ✅ MODIFIÉ: Chargement des statistiques via orderService  
  const fetchStats = useCallback(async () => {    
    try {    
      const response = await orderService.getOrderStats();    
      if (isMountedRef.current) {  
        setStats(response);    
      }  
    } catch (err) {    
      console.error('Erreur lors du chargement des statistiques:', err);    
    }    
  }, []);    
    
  // Fonction principale de chargement des données    
  const fetchData = useCallback(async (currentFilters = null, currentPage = null) => {    
    await fetchOrders(currentFilters, currentPage);    
    await fetchStats();    
  }, [fetchOrders, fetchStats]);    
    
  // Effet principal pour charger les données    
  useEffect(() => {    
    fetchData(filters, pagination.page);    
  }, [filters, pagination.page]);    
    
  // Chargement initial des données de référence    
  useEffect(() => {    
    fetchTrucks();    
  }, [fetchTrucks]);    
    
  // Debounce pour la recherche    
  useEffect(() => {    
    if (searchTimeoutRef.current) {    
      clearTimeout(searchTimeoutRef.current);    
    }    
    
    if (filters.search.length >= 2 || filters.search === '') {    
      searchTimeoutRef.current = setTimeout(() => {    
        if (!isMountedRef.current) return;    
        fetchData({ ...filters }, 1);    
      }, 500);    
    }    
    
    return () => {    
      if (searchTimeoutRef.current) {    
        clearTimeout(searchTimeoutRef.current);    
      }    
    };    
  }, [filters.search, fetchData]);    
    
  // Gestionnaires d'événements    
  const handleFilterChange = useCallback((filterType, value) => {    
    setFilters(prev => ({ ...prev, [filterType]: value }));    
    if (filterType !== 'search') {    
      setPagination(prev => ({ ...prev, page: 1 }));    
    }    
  }, []);    
    
  const handleViewDetails = useCallback(async (order) => {    
    try {    
      console.log('🔍 [DEBUG] Récupération détails pour commande:', order.id);
      
      // 1. Récupérer les détails de la commande
      const detailedOrder = await orderService.getOrder(order.id);
      console.log('📋 [DEBUG] Détails commande:', detailedOrder);
      
      // 2. ✅ NOUVEAU: Récupérer les informations de planification
      let planificationData = null;
      try {
        const planificationResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/planifications?commande_id=${order.id}`, {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (planificationResponse.ok) {
          const planificationResult = await planificationResponse.json();
          if (planificationResult.success && planificationResult.data.length > 0) {
            planificationData = planificationResult.data[0];
            console.log('📋 [DEBUG] Planification trouvée:', planificationData);
          }
        }
      } catch (error) {
        console.warn('⚠️ [WARN] Impossible de récupérer la planification:', error);
      }
      
      // 3. ✅ NOUVEAU: Récupérer les informations de livraison
      let livraisonData = null;
      try {
        const livraisonResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/livraisons?planification_id=${planificationData?._id || ''}`, {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (livraisonResponse.ok) {
          const livraisonResult = await livraisonResponse.json();
          if (livraisonResult.success && livraisonResult.data.length > 0) {
            livraisonData = livraisonResult.data[0];
            console.log('🚚 [DEBUG] Livraison trouvée:', livraisonData);
          }
        }
      } catch (error) {
        console.warn('⚠️ [WARN] Impossible de récupérer la livraison:', error);
      }
      
      // 4. Combiner toutes les données
      const enrichedOrder = {
        ...detailedOrder,
        planification: planificationData,
        livraison: livraisonData
      };
      
      console.log('✅ [DEBUG] Commande enrichie:', enrichedOrder);
      setSelectedOrder(enrichedOrder);
      setIsDetailsModalOpen(true);
      
    } catch (error) {    
      console.error('❌ Erreur lors du chargement des détails:', error);    
      showNotification('Erreur lors du chargement des détails', 'error');    
    }    
  }, [showNotification]);    
    
  const handleAssignTruck = useCallback((order) => {    
    setSelectedOrder(order);    
    setIsAssignModalOpen(true);    
  }, []);    
    
  // ✅ MODIFIÉ: Fonction d'assignation utilisant la nouvelle API  
  const handleSaveAssignment = useCallback(async (assignmentData) => {    
    if (!selectedOrder) return;    
    
    try {    
      // ✅ MODIFIÉ: Payload pour la nouvelle API de planification  
      const payload = {    
        truckId: assignmentData.truckId,    
        priority: assignmentData.priority,    
        scheduledDate: assignmentData.scheduledDate    
      };    
    
      await orderService.assignTruck(selectedOrder.id, payload);  
        
      if (isMountedRef.current) {  
        // ✅ MODIFIÉ: Mettre à jour l'ordre local avec les nouvelles données  
        setOrders(prev => prev.map(order => {      
          if (order.id === selectedOrder.id) {      
            const assignedTruck = trucks.find(t => t.id === assignmentData.truckId);      
                  
            return {      
              ...order,      
              status: 'assigned',      
              priority: assignmentData.priority,    
              assignedTruckId: assignmentData.truckId,      
              assignedTruck: assignedTruck ? {      
                id: assignedTruck.id,      
                plateNumber: assignedTruck.plateNumber,      
                model: assignedTruck.model,    
                capacity: assignedTruck.capacity,    
                driverName: assignedTruck.driver?.name || 'Non assigné'  
              } : null     
            };     
          }    
          return order;    
        }));    
  
        showNotification(    
          `Commande ${selectedOrder.orderNumber} assignée avec succès`,    
          'success'    
        );    
        setIsAssignModalOpen(false);    
            
        // Rafraîchir les statistiques    
        await fetchStats();    
      }  
    } catch (error) {    
      console.error('Erreur lors de l\'assignation:', error);    
      if (isMountedRef.current) {  
        showNotification('Erreur lors de l\'assignation', 'error');    
      }  
    }    
  }, [selectedOrder, trucks, showNotification, fetchStats]);    
    
  // ✅ MODIFIÉ: Utiliser la nouvelle route pour annuler planification  
  const handleCancelAssignment = useCallback(async (order) => {    
    try {    
      await orderService.cancelAssignment(order.id);  
        
      if (isMountedRef.current) {  
        // Mettre à jour la commande dans l'état local    
        setOrders(prev => prev.map(o =>     
          o.id === order.id     
            ? { ...o, status: 'pending', assignedTruck: null, assignedTruckId: null }    
            : o    
        ));    
    
        showNotification(`Assignation de la commande ${order.orderNumber} annulée`, 'success');    
        await fetchStats();    
      }  
    } catch (error) {    
      console.error('Erreur lors de l\'annulation:', error);    
      if (isMountedRef.current) {  
        showNotification('Erreur lors de l\'annulation', 'error');    
      }  
    }    
  }, [showNotification, fetchStats]);    
    
  const handleRefresh = useCallback(() => {    
    fetchData(filters, pagination.page);    
  }, [fetchData, filters, pagination.page]);    
    
  const handlePageChange = useCallback((newPage) => {    
    setPagination(prev => ({ ...prev, page: newPage }));    
  }, []);    
    
  // Cleanup au démontage    
  useEffect(() => {    
    isMountedRef.current = true;    
    return () => {    
      isMountedRef.current = false;    
      if (searchTimeoutRef.current) {    
        clearTimeout(searchTimeoutRef.current);    
      }    
    };    
  }, []);    
    
  // Fonctions utilitaires pour l'affichage    
  const getStatusColor = (status) => {    
    const statusColors = {    
      pending: 'om-status-pending',    
      assigned: 'om-status-assigned',    
      in_progress: 'om-status-in-progress',    
      delivered: 'om-status-delivered',    
      cancelled: 'om-status-cancelled'    
    };    
    return statusColors[status] || 'om-status-default';    
  };    
    
  const getStatusText = (status) => {    
    const statusTexts = {    
      pending: 'En attente',    
      assigned: 'Assignée',    
      in_progress: 'En cours',    
      delivered: 'Livrée',    
      cancelled: 'Annulée'    
    };    
    return statusTexts[status] || status;    
  };    
    
  const getPriorityColor = (priority) => {    
    const priorityColors = {    
      urgent: 'om-priority-urgent',    
      high: 'om-priority-high',    
      medium: 'om-priority-medium',    
      low: 'om-priority-low'    
    };    
    return priorityColors[priority] || 'om-priority-default';    
  };    
    
  const getPriorityText = (priority) => {    
    const priorityTexts = {    
      urgent: 'Urgente',    
      high: 'Haute',    
      medium: 'Moyenne',    
      low: 'Basse'    
    };    
    return priorityTexts[priority] || priority;    
  };    

  const getTotalAmount = (order) => {  
  // 🔧 PRIORITÉ 1: Montant calculé lors de la création de commande  
  if (order.montant_total) return order.montant_total;  
    
  // 🔧 PRIORITÉ 2: Calculer depuis les lignes de commande (products)  
  if (order.products && order.products.length > 0) {  
    const calculatedTotal = order.products.reduce((total, product) => {  
      const quantity = product.quantity || product.quantite || 0;  
      const price = product.price || product.prix_unitaire || 0;  
      return total + (quantity * price);  
    }, 0);  
      
    // Ajouter les frais de livraison si pas déjà inclus  
    return calculatedTotal > 0 ? calculatedTotal + 20 : calculatedTotal;  
  }  
    
  // 🔧 PRIORITÉ 3: Montant depuis planification/livraison (après assignation)  
  if (order.livraison?.total) return order.livraison.total;  
  if (order.planification?.total) return order.planification.total;  
    
  return 0;  
}; 
  
const getTruckInfo = (order) => {  
  if (order.assignedTruck) return order.assignedTruck;  
  if (order.planification?.trucks_id) {  
    return {  
      plateNumber: order.planification.trucks_id.matricule || 'N/A',  
      model: order.planification.trucks_id.marque || 'N/A',  
      driverName: order.planification.livreur_employee_id?.physical_user_id   
        ? `${order.planification.livreur_employee_id.physical_user_id.first_name} ${order.planification.livreur_employee_id.physical_user_id.last_name}`  
        : 'Non assigné'  
    };  
  }  
  return null;  
};

// ✅ NOUVEAU: Fonction pour obtenir l'état de livraison
const getDeliveryStatus = (order) => {
  // Si la commande a une livraison, afficher son état
  if (order.livraison) {
    return {
      status: order.livraison.etat,
      text: getDeliveryStatusText(order.livraison.etat),
      color: getDeliveryStatusColor(order.livraison.etat)
    };
  }
  
  // Si la commande a une planification, afficher son état
  if (order.planification) {
    return {
      status: order.planification.etat,
      text: getDeliveryStatusText(order.planification.etat),
      color: getDeliveryStatusColor(order.planification.etat)
    };
  }
  
  // Si la commande est assignée mais pas encore planifiée
  if (order.status === 'assigned') {
    return {
      status: 'PLANIFIE',
      text: 'Planifiée',
      color: 'om-delivery-status-planned'
    };
  }
  
  // Par défaut
  return {
    status: 'PENDING',
    text: 'En attente',
    color: 'om-delivery-status-pending'
  };
};

// ✅ NOUVEAU: Fonction pour obtenir le texte de l'état de livraison
const getDeliveryStatusText = (status) => {
  const statusTexts = {
    'PENDING': 'En attente',
    'PLANIFIE': 'Planifiée',
    'EN_COURS': 'En cours',
    'LIVRE': 'Livrée',
    'ANNULE': 'Annulée',
    'REPORTE': 'Reportée'
  };
  return statusTexts[status] || status;
};

// ✅ NOUVEAU: Fonction pour obtenir la couleur de l'état de livraison
const getDeliveryStatusColor = (status) => {
  const statusColors = {
    'PENDING': 'om-delivery-status-pending',
    'PLANIFIE': 'om-delivery-status-planned',
    'EN_COURS': 'om-delivery-status-in-progress',
    'LIVRE': 'om-delivery-status-delivered',
    'ANNULE': 'om-delivery-status-cancelled',
    'REPORTE': 'om-delivery-status-postponed'
  };
  return statusColors[status] || 'om-delivery-status-default';
};
    
  // Loading state - affichage initial    
  if (loading && orders.length === 0) {    
    return (    
      <div className="om-layout">    
        <SidebarNavigation/>    
        <div className="om-wrapper">    
          <div className="om-container">    
            <LoadingSpinner />    
          </div>    
        </div>    
      </div>    
    );    
  }    
    
  return (    
    <div className="om-layout">    
      <SidebarNavigation/>    
      <div className="om-wrapper">    
        <div className="om-container">    
          <div className="om-content">    
            {/* Header */}    
            <div className="om-header">    
              <div className="om-header-content">    
                <h2 className="om-title">Gestion des Commandes</h2>    
                <p className="om-subtitle">Gérez et assignez les commandes clients aux camions</p>    
              </div>    
              <div className="om-header-actions">    
                <button    
                  onClick={handleRefresh}    
                  className="om-btn om-btn-secondary"    
                  disabled={loading}    
                  title="Actualiser"    
                >    
                  <Refresh className={`om-btn-icon ${loading ? 'om-spinning' : ''}`} />    
                  Actualiser    
                </button>    
              </div>    
            </div>    
    
            {/* Notification */}    
            {notification && (    
              <div className={`om-alert ${notification.type === 'success' ? 'om-alert-success' : 'om-alert-error'}`}>    
                {notification.type === 'success' ? (    
                  <CheckCircle className="om-alert-icon" />    
                ) : (    
                  <AlertTriangle className="om-alert-icon" />    
                )}    
                <div className="om-alert-content">    
                  {notification.message}    
                </div>    
                <button     
                  className="om-alert-close"    
                  onClick={hideNotification}    
                >    
                  <X />    
                </button>    
              </div>    
            )}    
    
            {/* Error Display */}    
            {error && (    
              <div className="om-alert om-alert-error">    
                <AlertTriangle className="om-alert-icon" />    
                <div className="om-alert-content">    
                  {error}    
                </div>    
                <button     
                  className="om-alert-close"    
                  onClick={() => window.location.reload()}    
                >    
                  <Refresh />    
                </button>    
              </div>    
            )}    
    
            {/* Statistics Cards */}    
            <div className="om-stats-grid">    
              <div className="om-stat-card">    
                <div className="om-stat-content">    
                  <div className="om-stat-info">    
                    <p className="om-stat-label">Total</p>    
                    <p className="om-stat-value">{stats.total}</p>    
                  </div>    
                  <ClipboardList className="om-stat-icon om-text-blue" />    
                </div>    
              </div>    
    
              <div className="om-stat-card">    
                <div className="om-stat-content">    
                  <div className="om-stat-info">    
                    <p className="om-stat-label">En attente</p>    
                    <p className="om-stat-value om-text-yellow">{stats.pending}</p>    
                  </div>    
                  <Clock className="om-stat-icon om-text-yellow" />    
                </div>    
              </div>    
    
              <div className="om-stat-card">    
                <div className="om-stat-content">    
                  <div className="om-stat-info">    
                    <p className="om-stat-label">Assignées</p>    
                    <p className="om-stat-value om-text-blue">{stats.assigned}</p>    
                  </div>    
                  <TruckIcon className="om-stat-icon om-text-blue" />    
                </div>    
              </div>    
    
              <div className="om-stat-card">    
                <div className="om-stat-content">    
                  <div className="om-stat-info">    
                    <p className="om-stat-label">En cours</p>    
                    <p className="om-stat-value om-text-purple">{stats.inProgress}</p>    
                  </div>    
                  <Package className="om-stat-icon om-text-purple" />    
                </div>    
              </div>    
    
              <div className="om-stat-card">    
                <div className="om-stat-content">    
                  <div className="om-stat-info">    
                    <p className="om-stat-label">Livrées</p>    
                    <p className="om-stat-value om-text-green">{stats.delivered}</p>    
                  </div>    
                  <CheckCircle className="om-stat-icon om-text-green" />    
                </div>    
              </div>    
            </div>    
    
            {/* Filters */}    
            <div className="om-card">    
              <div className="om-card-header">    
                <h3 className="om-card-title">    
                  <Filter className="om-card-icon" />    
                  Filtres et Recherche    
                </h3>    
              </div>    
              <div className="om-card-content">    
                <div className="om-filters-grid">    
                  <div className="om-form-group">    
                    <label htmlFor="search" className="om-label">Recherche</label>    
                    <div className="om-search-container">    
                      <Search className="om-search-icon" />    
                      <input    
                        id="search"    
                        type="text"    
                        placeholder="Numéro de commande ou client..."    
                        value={filters.search}    
                        onChange={(e) => handleFilterChange('search', e.target.value)}    
                        className="om-search-input"    
                      />    
                    </div>    
                  </div>    
    
  
    
                  <div className="om-form-group">    
                    <label htmlFor="priority-filter" className="om-label">Priorité</label>    
                    <select    
                      id="priority-filter"    
                      value={filters.priority}    
                      onChange={(e) => handleFilterChange('priority', e.target.value)}    
                      className="om-select"    
                    >    
                      <option value="all">Toutes les priorités</option>    
                      <option value="urgent">Urgente</option>    
                      <option value="high">Haute</option>    
                      <option value="medium">Moyenne</option>    
                      <option value="low">Basse</option>    
                    </select>    
                  </div>    
    
                  <div className="om-form-group">  
                    <label htmlFor="date" className="om-label">Date</label>  
                    <input  
                      id="date"  
                      type="date"  
                      value={filters.date}  
                      onChange={(e) => handleFilterChange('date', e.target.value)}  
                      className="om-input"  
                      title="Filtrer les commandes de cette date"  
                    />  
                  </div> 
                </div>    
              </div>    
            </div>    
    
            {/* Orders Table */}    
            <div className="om-card">    
              <div className="om-card-header">    
                <div className="om-card-header-with-badge">    
                  <h3 className="om-card-title">Liste des Commandes</h3>    
                  <div className="om-badge">    
                    {pagination.total} commande{pagination.total !== 1 ? 's' : ''}    
                  </div>    
                </div>    
                {loading && (    
                  <div className="om-loading-indicator">    
                    <LoadingSpinner size="small" />    
                  </div>    
                )}    
              </div>    
              <div className="om-card-content">    
                <div className="om-table-container">    
                  <table className="om-table">    
                    <thead>    
                      <tr>    
                        <th>Numéro</th>    
                        <th>Client</th>    
                        <th>Date</th>    
                        <th>Statut</th>    
                        <th>Priorité</th>    
                        <th>Camion Assigné</th>    
                        <th>État Livraison</th>    
                        <th>Montant</th>    
                        <th>Actions</th>    
                      </tr>    
                    </thead>    
                    <tbody>    
                      {orders.length === 0 ? (    
                        <tr>    
                          <td colSpan={8} className="om-empty-state">    
                            <ClipboardList className="om-empty-icon" />    
                            <h3 className="om-empty-title">Aucune commande trouvée</h3>    
                            <p className="om-empty-message">    
                              {Object.values(filters).some(f => f && f !== 'all')    
                                ? "Aucune commande ne correspond à vos critères."      
                                : "Aucune commande disponible."}      
                            </p>      
                          </td>      
                        </tr>      
                      ) : (      
                        orders.map((order) => (      
                          <tr key={order.id} className="om-table-row">      
                            <td className="om-font-medium">{order.orderNumber}</td>      
                            <td>      
                              <div className="om-customer-info">      
                                <p className="om-customer-name">{order.customer.name}</p>      
                                <p className="om-customer-phone">{order.customer.phone}</p>      
                              </div>      
                            </td>      
                            <td>      
                              <div className="om-date-info">      
                                <p className="om-order-date">      
                                  {new Date(order.orderDate).toLocaleDateString("fr-FR")}      
                                </p>      
                                <p className="om-delivery-date">      
                                  Livraison: {new Date(order.requestedDeliveryDate).toLocaleDateString("fr-FR")}      
                                </p>      
                              </div>      
                            </td>      
                            <td>      
                              <div className={`om-status-badge ${getStatusColor(order.status)}`}>      
                                <span className="om-status-text">{getStatusText(order.status)}</span>      
                              </div>      
                            </td>      
                            <td>      
                              <div className={`om-priority-badge ${getPriorityColor(order.priority)}`}>      
                                <span className="om-priority-text">{getPriorityText(order.priority)}</span>      
                              </div>      
                            </td>      
                            <td>    
                              {(() => {    
                                const truckInfo = getTruckInfo(order);    
                                return truckInfo ? (    
                                  <div className="om-truck-info">    
                                    <p className="om-truck-plate">{truckInfo.plateNumber}</p>    
                                    <p className="om-truck-driver">{truckInfo.driverName}</p>    
                                  </div>    
                                ) : (    
                                  <span className="om-not-assigned">Non assigné</span>    
                                );    
                              })()}    
                            </td>    
                            <td>    
                              {(() => {    
                                const deliveryStatus = getDeliveryStatus(order);    
                                return (    
                                  <div className={`om-delivery-status-badge ${deliveryStatus.color}`}>    
                                    <span className="om-delivery-status-text">{deliveryStatus.text}</span>    
                                  </div>    
                                );    
                              })()}    
                            </td>    
                            <td>    
                              <div className="om-amount-info">    
                                <span className="om-amount">    
                                  {getTotalAmount(order).toFixed(2)} DH    
                                </span>    
                              </div>    
                            </td>     
                                
                            <td>      
                              <div className="om-action-buttons">      
                                <button      
                                  onClick={() => handleViewDetails(order)}      
                                  className="om-btn om-btn-secondary"      
                                  title="Voir les détails"      
                                >      
                                  <Eye className="om-btn-icon" />      
                                </button>      
                                <button      
                                  onClick={() => handleAssignTruck(order)}      
                                  className="om-btn om-btn-secondary"      
                                  title="Assigner au camion"      
                                  disabled={order.status === 'delivered' || order.status === 'cancelled'}      
                                >      
                                  <TruckIcon className="om-btn-icon" />      
                                </button>      
                                {order.assignedTruckId && order.status === 'assigned' && (      
                                  <button      
                                    onClick={() => handleCancelAssignment(order)}      
                                    className="om-btn om-btn-danger"      
                                    title="Annuler l'assignation"      
                                  >      
                                    <X className="om-btn-icon" />      
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
      
                {/* Pagination */}      
                {pagination.totalPages > 1 && (      
                  <Pagination      
                    currentPage={pagination.page}      
                    totalPages={pagination.totalPages}      
                    totalItems={pagination.total}      
                    itemsPerPage={pagination.limit}      
                    onPageChange={handlePageChange}      
                  />      
                )}      
              </div>      
            </div>      
          </div>      
        </div>      
      </div>      
      
      {/* Modales */}      
      {isDetailsModalOpen && selectedOrder && (      
        <OrderDetailsModal      
          order={selectedOrder}      
          onClose={() => setIsDetailsModalOpen(false)}      
        />      
      )}      
      
      {isAssignModalOpen && selectedOrder && (      
        <TruckAssignmentModal      
          order={selectedOrder}      
          trucks={trucks}      
          loading={trucksLoading}      
          onSave={handleSaveAssignment}      
          onClose={() => setIsAssignModalOpen(false)}      
        />      
      )}        
    </div>      
  );      
};      
      
export default OrderManagement;  