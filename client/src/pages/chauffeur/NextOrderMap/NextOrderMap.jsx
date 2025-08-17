import React, { useState, useEffect, useRef } from 'react'
import {
  MdLocationOn as MapPin,
  MdNavigation as Navigation,
  MdInventory as Package,
  MdAccessTime as Clock,
  MdCheckCircle as CheckCircle,
  MdRoute as Route,
  MdWarning as AlertTriangle,
  MdKeyboardArrowUp as ArrowUp,
  MdKeyboardArrowDown as ArrowDown,
  MdRemove as Minus,
  MdGpsFixed as Target,
  MdRefresh as Loader2,
  MdClose as X,
  MdVisibility as Eye,
  MdPhone as Phone,
  MdEmail as Email,
  MdAdd as Plus
} from 'react-icons/md'
import './NextOrderMap.css'
import livraisonService from '../../../services/livraisonService'
import { authService } from '../../../services/authService'
import planificationService from '../../../services/planificationService'

export default function NextOrderMapPage() {
  const [livraisons, setLivraisons] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
  const [statusAction, setStatusAction] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const mapRef = useRef(null)
  
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Récupérer l'utilisateur connecté
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        console.log('🔍 DÉBUT - Récupération utilisateur connecté')
        const token = authService.getToken()
        
        if (!token) {
          console.error('❌ ERREUR: Aucun token trouvé')
          setNotification({
            type: "error",
            message: "Session expirée - veuillez vous reconnecter"
          })
          return
        }
        
        const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!response.ok) {
          console.error('❌ ERREUR API:', response.status, response.statusText)
          setNotification({
            type: "error",
            message: `Erreur API: ${response.status} - ${response.statusText}`
          })
          return
        }
        
        const data = await response.json()
        
        if (!data.success || !data.data) {
          console.error('❌ ERREUR: Données utilisateur manquantes')
          setNotification({
            type: "error",
            message: "Erreur lors de la récupération du profil"
          })
          return
        }
        
        const userData = {
          ...data.data,
          employee_id: data.data.employee_info?._id || data.data.employee_info?.matricule
        }
        
        if (!userData.employee_id) {
          console.error('❌ ERREUR: employee_id manquant dans userData')
          setNotification({
            type: "error",
            message: "ID employé manquant - contactez l'administrateur"
          })
          return
        }
        
        console.log('✅ Employee ID trouvé:', userData.employee_id)
        setCurrentUser(userData)
        
      } catch (error) {
        console.error('💥 EXCEPTION lors de la récupération utilisateur:', error)
        setNotification({
          type: "error",
          message: `Erreur technique: ${error.message}`
        })
      }
    }
    fetchCurrentUser()
  }, [])

  // ✅ FONCTION CORRIGÉE: Analyse correcte des relations Planification-Livraison
  const refreshDeliveryData = async () => {  
    if (!currentUser?.employee_id) {  
      console.log('⏳ ATTENTE: employee_id non disponible')  
      return  
    }  
    
    try {  
      console.log('🔄 Rechargement des données...')  
        
       
      const planificationsResponse = await planificationService.getPlanificationsByEmployee(currentUser.employee_id);  
        
      console.log('📋 Planifications brutes:', planificationsResponse.data?.length || 0)  
        
      // ✅ FILTRAGE SIMPLE: Exclure les commandes terminées  
      const filteredPlanifications = planificationsResponse.data?.filter(planification => {  
        const commandeStatut = planification.commande_id?.statut;  
        const isCommandeTerminee = ['LIVREE', 'ANNULEE', 'ECHEC'].includes(commandeStatut);  
          
        console.log(`🔍 Planification ${planification._id}: commande ${commandeStatut}`)  
          
        // Garder seulement les commandes non terminées  
        return !isCommandeTerminee;  
      }) || [];  
        
      console.log('✅ Résultat final:')  
      console.log(`  - Planifications gardées: ${filteredPlanifications.length}`)  
    
      setLivraisons(filteredPlanifications);  
        
    } catch (error) {  
      console.error('💥 Erreur lors du rechargement:', error);  
      setNotification({  
        type: "error",  
        message: `Erreur chargement: ${error.message}`  
      })  
    }  
  };

  // Récupérer les données de livraison au chargement
  useEffect(() => {
    const fetchDeliveryData = async () => {
      if (!currentUser?.employee_id) {
        return
      }

      try {
        setLoading(true)
        await refreshDeliveryData()
        
        if (livraisons.length === 0) {
          setNotification({
            type: "info",
            message: "Aucune livraison assignée pour le moment"
          })
        }
        
      } catch (error) {
        console.error('💥 EXCEPTION lors de la récupération des données:', error)
        setNotification({
          type: "error",
          message: `Erreur chargement: ${error.message}`
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDeliveryData()
  }, [currentUser])

  // ✅ TRANSFORMATION CORRIGÉE: Gestion correcte des types Planification/Livraison
  const transformLivraisonToOrder = (item) => {
    if (!item) return null
    
    const itemId = item.id || item._id
    if (!itemId) return null
    
    // ✅ IDENTIFICATION CORRECTE DU TYPE basée sur les états métier
    const isPlanification = item.etat === 'PLANIFIE'
    const isLivraison = ['EN_COURS', 'LIVRE', 'ECHEC', 'ANNULE'].includes(item.etat)
    
    const commandeData = item.commande_id
    const customerData = item.commande_id?.customer_id
    const addressData = item.commande_id?.address_id
    
    if (!commandeData) return null
    
    return {
      id: itemId,
      orderNumber: commandeData?.numero_commande || 'N/A',
      // ✅ GESTION CORRECTE DE L'ID DE PLANIFICATION
      planificationId: isPlanification ? itemId : (item.planification_id?._id || item.planification_id || itemId),
      customer: {
        id: customerData?._id || '',
        name: customerData?.physical_user_id 
          ? `${customerData.physical_user_id.first_name} ${customerData.physical_user_id.last_name}`
          : customerData?.moral_user_id?.raison_sociale || 'Client inconnu',
        phone: customerData?.physical_user_id?.telephone_principal || 
               customerData?.moral_user_id?.telephone_principal || '',
        email: '',
      },
      deliveryAddress: {
        street: addressData?.street || '',
        city: addressData?.city_id?.name || '',
        postalCode: addressData?.postal_code || '',
        latitude: addressData?.latitude || 0,
        longitude: addressData?.longitude || 0,
      },
      orderDate: commandeData?.date_commande || new Date().toISOString(),
      requestedDeliveryDate: item.delivery_date || item.date || new Date().toISOString(),
      status: mapLivraisonStatus(item.etat),
      priority: item.priority || 'medium',
      products: commandeData?.lignes || [],
      totalAmount: commandeData?.montant_total || item.total || 0,
      customerNotes: commandeData?.details || item.details || '',
      estimatedDeliveryTime: new Date(item.delivery_date || item.date || new Date()).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      timeWindow: {
        start: new Date(item.delivery_date || item.date || new Date()).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        end: new Date(new Date(item.delivery_date || item.date || new Date()).getTime() + 2 * 60 * 60 * 1000).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      },
      distanceFromCurrent: 0,
      estimatedTravelTime: 0,
      livraisonId: isLivraison ? itemId : null,
      etat: item.etat,
      isPlanification,
      isLivraison,
      history: [
        {
          id: `hist-${itemId}`,
          action: isPlanification ? 'Commande assignée' : 'Livraison démarrée',
          details: isPlanification ? 'Assignée au camion' : 'Chauffeur en route',
          timestamp: item.createdAt || new Date().toISOString(),
          userId: currentUser?.id || 'system',
          userName: currentUser?.name || 'Système',
        }
      ]
    }
  }

  // Mapping des statuts métier vers statuts d'affichage
  const mapLivraisonStatus = (etat) => {
    switch (etat) {
      case 'PLANIFIE': return 'assigned'
      case 'EN_COURS': return 'en_route'
      case 'LIVRE': return 'delivered'
      case 'ECHEC': return 'failed'
      case 'ANNULE': return 'cancelled'
      default: return 'assigned'
    }
  }

  // Convertir et filtrer les données pour l'affichage
  const orders = livraisons.map(transformLivraisonToOrder).filter(order => order !== null)
  
  // Filtrer les commandes actives (exclure les terminées)
  const activeOrders = orders.filter(order => 
    !['delivered', 'cancelled', 'failed'].includes(order.status)
  )

  // Trier par priorité
  const sortedOrders = [...activeOrders].sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 }
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return (a.estimatedTravelTime || 0) - (b.estimatedTravelTime || 0)
  })

  const nextOrder = sortedOrders[0]

  // ✅ DÉMARRAGE DE ROUTE CORRIGÉ: Gestion correcte de la transition Planification -> Livraison
  const handleStartRoute = async (order) => {
    if (!order.planificationId) {
      setNotification({
        type: "error",
        message: "Impossible de démarrer la livraison - planification manquante"
      })
      return
    }

    setLoading(true)
    try {
      const deliveryData = {
        latitude: currentUser?.currentLocation?.latitude || 0,
        longitude: currentUser?.currentLocation?.longitude || 0,
        details: `Démarrage de la livraison pour ${order.customer.name}`
      }

      console.log('🚀 Démarrage livraison pour planification:', order.planificationId)
      
      // Créer la livraison depuis la planification (relation 1:1)  
      await livraisonService.startLivraison(order.planificationId, deliveryData)  
  
      // ✅ DÉLAI DE SYNCHRONISATION: Permettre au backend de traiter la création  
      await new Promise(resolve => setTimeout(resolve, 1500));  
  
      // Recharger les données avec filtrage intelligent  
      await refreshDeliveryData()  
  
      setNotification({  
        type: "success",  
        message: `Route démarrée vers ${order.customer.name}`  
      })  
  
      // Ouvrir Google Maps  
      const address = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}`  
      const encodedAddress = encodeURIComponent(address)  
      console.log('🗺️ Ouverture Google Maps pour:', address)  
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank")  
  
      setTimeout(() => setNotification(null), 5000)  
    } catch (error) {  
      console.error('💥 EXCEPTION démarrage route:', error)  
      setNotification({  
        type: "error",  
        message: "Erreur lors du démarrage de la route"  
      })  
    } finally {  
      setLoading(false)  
    }  
  }  
  
  // ✅ GESTION DES CHANGEMENTS DE STATUT CORRIGÉE  
  const handleStatusChange = async (order, newStatus, note = '') => {  
    setLoading(true)  
    try {  
      const statusMapping = {  
        'delivered': 'LIVRE',  
        'failed': 'ECHEC',  
        'cancelled': 'ANNULE'  
      }  
  
      let livraisonId = null  
  
      // ✅ RECHERCHE INTELLIGENTE: Chercher une livraison existante  
      try {  
        console.log('🔍 Recherche livraison pour planification:', order.planificationId)  
          
        // Utiliser l'API pour chercher par planification_id  
        const existingLivraisons = await livraisonService.getLivraisons({  
          planification_id: order.planificationId,  
          etat: 'EN_COURS'  
        })  
  
        if (existingLivraisons.data && existingLivraisons.data.length > 0) {  
          const existingLivraison = existingLivraisons.data[0]  
          livraisonId = existingLivraison.id || existingLivraison._id  
          console.log('✅ Livraison existante trouvée:', livraisonId)  
        }  
      } catch (searchError) {  
        console.error('❌ Erreur recherche livraison:', searchError)  
      }  
  
      // ✅ CRÉATION AUTOMATIQUE: Si aucune livraison trouvée pour une planification  
      if (!livraisonId && order.isPlanification && order.etat === 'PLANIFIE') {  
        console.log('📋 Création automatique de livraison pour planification')  
          
        const deliveryData = {  
          latitude: currentUser?.currentLocation?.latitude || 0,  
          longitude: currentUser?.currentLocation?.longitude || 0,  
          details: `Démarrage automatique pour changement de statut`  
        }  
  
        const startResult = await livraisonService.startLivraison(order.planificationId, deliveryData)  
        livraisonId = startResult.data?._id || startResult._id  
          
        // Délai pour permettre la création  
        await new Promise(resolve => setTimeout(resolve, 1000));  
      }  
  
      if (!livraisonId) {  
        throw new Error('Impossible de trouver ou créer une livraison')  
      }  
  
      // ✅ FINALISATION: Compléter la livraison  
      const completionData = {  
        latitude: currentUser?.currentLocation?.latitude || 0,  
        longitude: currentUser?.currentLocation?.longitude || 0,  
        details: note,  
        commentaires_livreur: note,  
        etat: statusMapping[newStatus] || 'LIVRE'  
      }  
  
      console.log('📤 Finalisation livraison:', livraisonId, 'avec statut:', statusMapping[newStatus])  
      await livraisonService.completeLivraison(livraisonId, completionData)  
  
      // ✅ SYNCHRONISATION: Délai et rechargement  
      await new Promise(resolve => setTimeout(resolve, 1500));  
      await refreshDeliveryData()  
  
      setIsStatusModalOpen(false)  
      setStatusNote('')  
  
      const statusText = {  
        'delivered': 'livrée',  
        'failed': 'annulée (échec)',  
        'cancelled': 'annulée'  
      }  
  
      setNotification({  
        type: "success",  
        message: `Commande ${order.orderNumber} marquée comme ${statusText[newStatus]}`  
      })  
  
      setTimeout(() => setNotification(null), 5000)  
    } catch (error) {  
      console.error('💥 EXCEPTION changement statut:', error)  
      setNotification({  
        type: "error",  
        message: "Erreur lors de la mise à jour du statut"  
      })  
    } finally {  
      setLoading(false)  
    }  
  }  
  
  // Fonctions utilitaires pour l'affichage  
  const getPriorityColor = (priority) => {  
    switch (priority) {  
      case "urgent": return "nom-priority-urgent"  
      case "high": return "nom-priority-high"  
      case "medium": return "nom-priority-medium"  
      case "low": return "nom-priority-low"  
      default: return "nom-priority-default"  
    }  
  }  
  
  const getPriorityText = (priority) => {  
    switch (priority) {  
      case "urgent": return "Urgente"  
      case "high": return "Haute"  
      case "medium": return "Moyenne"  
      case "low": return "Basse"  
      default: return priority  
    }  
  }  
  
  const getPriorityIcon = (priority) => {  
    switch (priority) {  
      case "urgent":  
      case "high":  
        return <ArrowUp className="nom-priority-icon" />  
      case "medium":  
        return <Minus className="nom-priority-icon" />  
      case "low":  
        return <ArrowDown className="nom-priority-icon" />  
      default:  
        return null  
    }  
  }  
  
  const getStatusColor = (status) => {  
    switch (status) {  
      case "assigned": return "nom-status-assigned"  
      case "en_route": return "nom-status-en-route"  
      case "delivered": return "nom-status-delivered"  
      case "failed": return "nom-status-failed"  
      case "cancelled": return "nom-status-cancelled"  
      default: return "nom-status-default"  
    }  
  }  
  
  const getStatusText = (status) => {  
    switch (status) {  
      case "assigned": return "Assignée"  
      case "en_route": return "En route"  
      case "delivered": return "Livrée"  
      case "failed": return "Échec"  
      case "cancelled": return "Annulée"  
      default: return status  
    }  
  }  
  
  const handleViewDetails = (order) => {  
    setSelectedOrder(order)  
    setIsDetailsModalOpen(true)  
  }  
  
  const getMapMarkerColor = (priority) => {  
    switch (priority) {  
      case "urgent": return "#ef4444"  
      case "high": return "#f97316"  
      case "medium": return "#eab308"  
      case "low": return "#22c55e"  
      default: return "#6b7280"  
    }  
  }  
  
  useEffect(() => {  
    const timer = setTimeout(() => {  
      setMapLoaded(true)  
    }, 1500)  
    return () => clearTimeout(timer)  
  }, [])  
  
  if (loading && livraisons.length === 0) {  
    return (  
      <div className="nom-layout">  
        <div className="nom-wrapper">  
          <div className="nom-container">  
            <div className="nom-loading-container">  
              <Loader2 className="nom-loading-spinner" />  
              <p>Chargement de vos livraisons...</p>  
            </div>  
          </div>  
        </div>  
      </div>  
    )  
  }  
  
  return (  
    <div className="nom-layout">  
      <div className="nom-wrapper">  
        <div className="nom-container">  
          <main className="nom-main">  
            <div className="nom-page-header">  
              <h2 className="nom-page-title">Carte des Prochaines Commandes</h2>  
              <p className="nom-page-subtitle">Visualisez vos commandes assignées et planifiez votre itinéraire</p>  
            </div>  
  
            {/* Notification */}  
            {notification && (  
              <div className={`nom-alert nom-alert-${notification.type}`}>  
                {notification.type === "success" ? (  
                  <CheckCircle className="nom-alert-icon" />  
                ) : notification.type === "error" ? (  
                  <AlertTriangle className="nom-alert-icon" />  
                ) : (  
                  <Target className="nom-alert-icon" />  
                )}  
                <div className="nom-alert-content">  
                  {notification.message}  
                </div>  
              </div>  
            )}  
  
            {/* Next Order Priority Card */}  
            {nextOrder && (  
              <div className="nom-card nom-priority-card">  
                <div className="nom-card-header">  
                  <div className="nom-card-title">  
                    <Target className="nom-card-icon" />  
                    <span>Prochaine Commande Prioritaire</span>  
                  </div>  
                </div>  
                <div className="nom-card-content">  
                  <div className="nom-priority-content">  
                    <div className="nom-priority-info">  
                      <div className="nom-badges">  
                        <span className={`nom-badge ${getPriorityColor(nextOrder.priority)}`}>  
                          {getPriorityIcon(nextOrder.priority)}  
                          <span className="nom-badge-text">{getPriorityText(nextOrder.priority)}</span>  
                        </span>  
                        <span className={`nom-badge ${getStatusColor(nextOrder.status)}`}>  
                          {getStatusText(nextOrder.status)}  
                        </span>  
                      </div>  
                      <h3 className="nom-customer-name">{nextOrder.customer.name}</h3>  
                      <p className="nom-order-number">Commande: {nextOrder.orderNumber}</p>  
                      <div className="nom-order-details">  
                        <div className="nom-detail-item">  
                          <MapPin className="nom-detail-icon" />  
                          <span>  
                            {nextOrder.deliveryAddress.street}, {nextOrder.deliveryAddress.city}  
                          </span>  
                        </div>  
                        <div className="nom-detail-item">  
                          <Clock className="nom-detail-icon" />  
                          <span>  
                            {nextOrder.timeWindow.start} - {nextOrder.timeWindow.end}  
                          </span>  
                        </div>  
                        <div className="nom-detail-item">  
                          <Route className="nom-detail-icon" />  
                          <span>  
                            {nextOrder.distanceFromCurrent}km • {nextOrder.estimatedTravelTime}min  
                          </span>  
                        </div>  
                      </div>  
                    </div>  
                    <div className="nom-priority-actions">  
                      <button   
                        className="nom-btn nom-btn-secondary"   
                        onClick={() => handleViewDetails(nextOrder)}  
                      >  
                        Détails  
                      </button>  
                        
                      <button   
                        className="nom-btn nom-btn-success"   
                        onClick={() => {  
                          setSelectedOrder(nextOrder)  
                          setStatusAction('delivered')  
                          setIsStatusModalOpen(true)  
                        }}  
                        disabled={loading}  
                      >  
                        <CheckCircle className="nom-btn-icon" />  
                        Marquer Livré  
                      </button>  
  
                      <button   
                        className="nom-btn nom-btn-danger"   
                        onClick={() => {  
                          setSelectedOrder(nextOrder)  
                          setStatusAction('failed')  
                          setIsStatusModalOpen(true)  
                        }}  
                        disabled={loading}  
                      >  
                        <X className="nom-btn-icon" />  
                        Échec  
                      </button>  
  
                      {nextOrder.status === "assigned" && (  
                        <button   
                          className="nom-btn nom-btn-primary"   
                          onClick={() => handleStartRoute(nextOrder)}   
                          disabled={loading}  
                        >  
                          {loading ? (  
                            <>  
                              <Loader2 className="nom-btn-icon nom-spinner" />  
                              Démarrage...  
                            </>  
                          ) : (  
                            <>  
                              <Navigation className="nom-btn-icon" />  
                              Démarrer Route  
                            </>  
                          )}  
                        </button>  
                      )}  
                    </div>  
                  </div>  
                </div>  
              </div>  
            )}  
            <div className="nom-content-grid">  
              {/* Map Section */}  
              <div className="nom-map-section">  
                <div className="nom-card nom-map-card">  
                  <div className="nom-card-header">  
                    <div className="nom-card-title">  
                      <MapPin className="nom-card-icon" />  
                      <span>Carte Interactive</span>  
                    </div>  
                  </div>  
                  <div className="nom-card-content nom-map-content">  
                    <div ref={mapRef} className="nom-map-container">  
                      {!mapLoaded ? (  
                        <div className="nom-map-loading">  
                          <div className="nom-loading-content">  
                            <Loader2 className="nom-loading-spinner" />  
                            <p className="nom-loading-text">Chargement de la carte...</p>  
                          </div>  
                        </div>  
                      ) : (  
                        <div className="nom-map-wrapper">  
                          <div className="nom-map-bg" />  
                            
                          {/* Map Legend */}  
                          <div className="nom-map-legend">  
                            <h4 className="nom-legend-title">Légende des Priorités</h4>  
                            <div className="nom-legend-items">  
                              <div className="nom-legend-item">  
                                <div className="nom-legend-color nom-legend-urgent"></div>  
                                <span className="nom-legend-label">Urgente</span>  
                              </div>  
                              <div className="nom-legend-item">  
                                <div className="nom-legend-color nom-legend-high"></div>  
                                <span className="nom-legend-label">Haute</span>  
                              </div>  
                              <div className="nom-legend-item">  
                                <div className="nom-legend-color nom-legend-medium"></div>  
                                <span className="nom-legend-label">Moyenne</span>  
                              </div>  
                              <div className="nom-legend-item">  
                                <div className="nom-legend-color nom-legend-low"></div>  
                                <span className="nom-legend-label">Basse</span>  
                              </div>  
                            </div>  
                          </div>  
  
                          {/* Map Markers */}  
                          <div className="nom-map-markers">  
                            {activeOrders.map((order, index) => (  
                              <div  
                                key={order.id}  
                                className="nom-map-marker"  
                                style={{  
                                  left: `${20 + index * 15}%`,  
                                  top: `${30 + index * 10}%`,  
                                  backgroundColor: getMapMarkerColor(order.priority)  
                                }}  
                                onClick={() => handleViewDetails(order)}  
                              >  
                                <span className="nom-marker-number">{index + 1}</span>  
                                <div className="nom-marker-tooltip">  
                                  <p className="nom-tooltip-name">{order.customer.name}</p>  
                                  <p className="nom-tooltip-order">{order.orderNumber}</p>  
                                </div>  
                              </div>  
                            ))}  
  
                            {/* Current Location Marker */}  
                            <div className="nom-current-location">  
                              <div className="nom-current-marker"></div>  
                              <div className="nom-current-label">Ma position</div>  
                            </div>  
                          </div>  
  
                          {/* Map Controls */}  
                          <div className="nom-map-controls">  
                            <button className="nom-map-control">  
                              <Navigation className="nom-control-icon" />  
                            </button>  
                            <button className="nom-map-control">  
                              <Plus className="nom-control-icon" />  
                            </button>  
                            <button className="nom-map-control">  
                              <Minus className="nom-control-icon" />  
                            </button>  
                          </div>  
                        </div>  
                      )}  
                    </div>  
                  </div>  
                </div>  
              </div>  
  
              {/* Orders List */}  
              <div className="nom-orders-section">  
                <div className="nom-card nom-orders-card">  
                  <div className="nom-card-header">  
                    <div className="nom-card-title">  
                      <Package className="nom-card-icon" />  
                      <span>Mes Commandes</span>  
                    </div>  
                    <span className="nom-orders-count">{activeOrders.length} commandes</span>  
                  </div>  
                  <div className="nom-card-content nom-orders-content">  
                    <div className="nom-orders-list">  
                      {sortedOrders.map((order, index) => (  
                        <div  
                          key={order.id}  
                          className={`nom-order-item ${  
                            order.id === nextOrder?.id ? "nom-order-next" : ""  
                          }`}  
                          onClick={() => handleViewDetails(order)}  
                        >  
                          <div className="nom-order-header">  
                            <div className="nom-order-left">  
                              <div  
                                className="nom-order-marker"  
                                style={{ backgroundColor: getMapMarkerColor(order.priority) }}  
                              >  
                                {index + 1}  
                              </div>  
                              <span className={`nom-badge ${getPriorityColor(order.priority)}`}>  
                                {getPriorityIcon(order.priority)}  
                                <span className="nom-badge-text">{getPriorityText(order.priority)}</span>  
                              </span>  
                            </div>  
                            <span className={`nom-badge ${getStatusColor(order.status)}`}>  
                              {getStatusText(order.status)}  
                            </span>  
                          </div>  
  
                          <h3 className="nom-order-customer">{order.customer.name}</h3>  
                          <p className="nom-order-number">{order.orderNumber}</p>  
  
                          <div className="nom-order-info">  
                            <div className="nom-order-detail">  
                              <MapPin className="nom-order-icon" />  
                              <span className="nom-order-address">  
                                {order.deliveryAddress.street}, {order.deliveryAddress.city}  
                              </span>  
                            </div>  
                            <div className="nom-order-detail">  
                              <Clock className="nom-order-icon" />  
                              <span>  
                                {order.timeWindow.start} - {order.timeWindow.end}  
                              </span>  
                            </div>  
                          </div>  
                        </div>  
                      ))}  
                    </div>  
                  </div>  
                </div>  
              </div>  
            </div>  
          </main>  
        </div>  
      </div>  
  
      {/* Details Modal */}  
      {isDetailsModalOpen && selectedOrder && (  
        <div className="nom-modal-overlay" onClick={() => setIsDetailsModalOpen(false)}>  
          <div className="nom-modal-content" onClick={(e) => e.stopPropagation()}>  
            <div className="nom-modal-header">  
              <div className="nom-modal-title">  
                <Eye className="nom-modal-icon" />  
                <span>Détails de la Commande</span>  
              </div>  
              <button   
                className="nom-modal-close"   
                onClick={() => setIsDetailsModalOpen(false)}  
              >  
                <X className="nom-close-icon" />  
              </button>  
            </div>  
  
            <div className="nom-modal-body">  
              <div className="nom-details-grid">  
                {/* Customer Info */}  
                <div className="nom-details-section">  
                  <div className="nom-details-card">  
                    <div className="nom-details-header">  
                      <h4 className="nom-details-title">Informations Client</h4>  
                    </div>  
                    <div className="nom-details-content">  
                      <div className="nom-detail-row">  
                        <span className="nom-detail-label">Nom:</span>  
                        <span className="nom-detail-value">{selectedOrder.customer.name}</span>  
                      </div>  
                      <div className="nom-detail-row">  
                        <Phone className="nom-detail-icon" />  
                        <span className="nom-detail-value">{selectedOrder.customer.phone}</span>  
                      </div>  
                      {selectedOrder.customer.email && (  
                        <div className="nom-detail-row">  
                          <Email className="nom-detail-icon" />  
                          <span className="nom-detail-value">{selectedOrder.customer.email}</span>  
                        </div>  
                      )}  
                    </div>  
                  </div>  
                </div>  
  
                {/* Delivery Address */}  
                <div className="nom-details-section">  
                  <div className="nom-details-card">  
                    <div className="nom-details-header">  
                      <h4 className="nom-details-title">Adresse de Livraison</h4>  
                    </div>  
                    <div className="nom-details-content">  
                      <div className="nom-detail-row">  
                        <MapPin className="nom-detail-icon" />  
                        <div className="nom-address-info">  
                          <p>{selectedOrder.deliveryAddress.street}</p>  
                          <p>{selectedOrder.deliveryAddress.postalCode} {selectedOrder.deliveryAddress.city}</p>  
                        </div>  
                      </div>  
                    </div>  
                  </div>  
                </div>  
              </div>  
  
              {/* Products Section */}  
              <div className="nom-details-section nom-full-width">  
                <div className="nom-details-card">  
                  <div className="nom-details-header">  
                    <h4 className="nom-details-title">Produits Commandés</h4>  
                  </div>  
                  <div className="nom-details-content">  
                    <div className="nom-products-list">  
                      {selectedOrder.products.map((product) => (  
                        <div key={product._id || product.id} className="nom-product-item">  
                          <div className="nom-product-info">  
                            <h5 className="nom-product-name">  
                              {product.product_id?.long_name || product.product_id?.short_name || product.productName}  
                            </h5>  
                            <p className="nom-product-code">  
                              Code: {product.product_id?.ref || product.productCode}  
                            </p>  
                          </div>  
                          <div className="nom-product-details">  
                            <p className="nom-product-quantity">  
                              {product.quantity} {product.UM_id?.unitemesure || product.unit}  
                            </p>  
                            <p className="nom-product-price">  
                              {(product.price || product.unitPrice)?.toFixed(2)}MAD / unité  
                            </p>  
                            <p className="nom-product-total">  
                              Total: {((product.quantity * (product.price || product.unitPrice)) || product.totalPrice)?.toFixed(2)}MAD  
                            </p>  
                          </div>  
                        </div>  
                      ))}  
                    </div>  
                    <div className="nom-order-total">  
                      <div className="nom-total-row">  
                        <span className="nom-total-label">Total Commande:</span>  
                        <span className="nom-total-value">{selectedOrder.totalAmount?.toFixed(2)}MAD</span>  
                      </div>  
                    </div>  
                  </div>  
                </div>  
              </div>  
  
              {/* Customer Notes */}  
              {selectedOrder.customerNotes && (  
                <div className="nom-details-section nom-full-width">  
                  <div className="nom-details-card">  
                    <div className="nom-details-header">  
                      <h4 className="nom-details-title">Notes du Client</h4>  
                    </div>  
                    <div className="nom-details-content">  
                      <p className="nom-customer-notes">{selectedOrder.customerNotes}</p>  
                    </div>  
                  </div>  
                </div>  
              )}  
  
              {/* Order History */}  
              <div className="nom-details-section nom-full-width">  
                <div className="nom-details-card">  
                  <div className="nom-details-header">  
                    <h4 className="nom-details-title">Historique de la Commande</h4>  
                  </div>  
                  <div className="nom-details-content">  
                    <div className="nom-history-list">  
                      {selectedOrder.history.map((entry) => (  
                        <div key={entry.id} className="nom-history-item">  
                          <div className="nom-history-dot"></div>  
                          <div className="nom-history-content">  
                            <div className="nom-history-header">  
                              <h5 className="nom-history-action">{entry.action}</h5>  
                              <span className="nom-history-time">  
                                {new Date(entry.timestamp).toLocaleString('fr-FR')}  
                              </span>  
                            </div>  
                            <p className="nom-history-details">{entry.details}</p>  
                            <p className="nom-history-user">Par: {entry.userName}</p>  
                          </div>  
                        </div>  
                      ))}  
                    </div>  
                  </div>  
                </div>  
              </div>  
            </div>  
  
            <div className="nom-modal-footer">  
              <button   
                className="nom-btn nom-btn-secondary"   
                onClick={() => setIsDetailsModalOpen(false)}  
              >  
                Fermer  
              </button>  
              {selectedOrder.status === "assigned" && (  
                <button   
                  className="nom-btn nom-btn-primary"   
                  onClick={() => handleStartRoute(selectedOrder)}   
                  disabled={loading}  
                >  
                  {loading ? (  
                    <>  
                      <Loader2 className="nom-btn-icon nom-spinner" />  
                      Démarrage...  
                    </>  
                  ) : (  
                    <>  
                      <Navigation className="nom-btn-icon" />  
                      Démarrer Route  
                    </>  
                  )}  
                </button>  
              )}  
            </div>  
          </div>  
        </div>  
      )}  
  
      {/* Status Change Modal */}  
      {isStatusModalOpen && selectedOrder && (  
        <div className="nom-modal-overlay" onClick={() => setIsStatusModalOpen(false)}>  
          <div className="nom-modal-content nom-status-modal" onClick={(e) => e.stopPropagation()}>  
            <div className="nom-modal-header">  
              <div className="nom-modal-title">  
                {statusAction === 'delivered' ? (  
                  <>  
                    <CheckCircle className="nom-modal-icon" />  
                    <span>Marquer comme Livrée</span>  
                  </>  
                ) : statusAction === 'failed' ? (  
                  <>  
                    <X className="nom-modal-icon" />  
                    <span>Signaler un Échec</span>  
                  </>  
                ) : (  
                  <>  
                    <X className="nom-modal-icon" />  
                    <span>Annuler la Commande</span>  
                  </>  
                )}  
              </div>
              <button   
                className="nom-modal-close"   
                onClick={() => setIsStatusModalOpen(false)}  
              >  
                <X className="nom-close-icon" />  
              </button>  
            </div>  
  
            <div className="nom-modal-body">  
              <div className="nom-status-info">  
                <h3 className="nom-status-customer">{selectedOrder.customer.name}</h3>  
                <p className="nom-status-order">Commande: {selectedOrder.orderNumber}</p>  
                <p>Adresse: {selectedOrder.deliveryAddress.street}, {selectedOrder.deliveryAddress.city}</p>  
              </div>  
  
              <div className="nom-form-group">  
                <label htmlFor="status-note" className="nom-form-label">  
                  {statusAction === 'delivered' ? 'Note de livraison (optionnel)' :   
                   statusAction === 'failed' ? 'Raison de l\'échec' : 'Raison de l\'annulation'}  
                </label>  
                <textarea  
                  id="status-note"  
                  value={statusNote}  
                  onChange={(e) => setStatusNote(e.target.value)}  
                  placeholder={statusAction === 'delivered'   
                    ? "Ajouter une note sur la livraison..."   
                    : statusAction === 'failed'  
                    ? "Client absent, adresse incorrecte..."  
                    : "Expliquer la raison de l'annulation..."  
                  }  
                  className="nom-form-textarea"  
                  rows={3}  
                  required={statusAction !== 'delivered'}  
                />  
              </div>  
            </div>  
  
            <div className="nom-modal-footer">  
              <button   
                className="nom-btn nom-btn-secondary"   
                onClick={() => setIsStatusModalOpen(false)}  
              >  
                Annuler  
              </button>  
              <button   
                className={`nom-btn ${statusAction === 'delivered' ? 'nom-btn-success' : 'nom-btn-danger'}`}  
                onClick={() => handleStatusChange(selectedOrder, statusAction, statusNote)}  
                disabled={loading || (statusAction !== 'delivered' && !statusNote.trim())}  
              >  
                {loading ? (  
                  <>  
                    <Loader2 className="nom-btn-icon nom-spinner" />  
                    Traitement...  
                  </>  
                ) : (  
                  <>  
                    {statusAction === 'delivered' ? (  
                      <>  
                        <CheckCircle className="nom-btn-icon" />  
                        Confirmer Livraison  
                      </>  
                    ) : (  
                      <>  
                        <X className="nom-btn-icon" />  
                        Confirmer  
                      </>  
                    )}  
                  </>  
                )}  
              </button>  
            </div>  
          </div>  
        </div>  
      )}  
    </div>  
  )  
}