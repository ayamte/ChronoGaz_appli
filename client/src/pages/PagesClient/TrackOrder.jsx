import React from "react";  
import { useState, useEffect } from "react";  
import api from '../../services/api'; // 🔧 MODIFIÉ: Utiliser api au lieu d'axios  
import Title from "../../components/client/TrackOrderPage/Title";  
import OrderStatusCard from "../../components/client/TrackOrderPage/OrderStatusCard";  
import OrderProgress from "../../components/client/TrackOrderPage/OrderProgress";  
import DeliveryDriverInfo from "../../components/client/TrackOrderPage/DeliveryDriverInfo";  
import InteractiveMap from "../../components/client/TrackOrderPage/InteractiveMap";  
import OrderSummary from "../../components/client/TrackOrderPage/OrderSummary";  
import CancelOrderButton from '../../components/client/TrackOrderPage/CancelOrderButton';   
import './TrackOrder.css';   
  
import { useParams } from 'react-router-dom';  
  
const TrackOrder = () => {  
  // États pour les données de livraison et commande  
  const [deliveryData, setDeliveryData] = useState(null);  
  const [orderData, setOrderData] = useState(null);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState(null);  
  
  // 🔧 MODIFIÉ: Récupérer l'ID de commande depuis les paramètres de l'URL  
  const { orderId } = useParams();  
  
  // Fetch des données de commande réelles  
  useEffect(() => {  
    const fetchOrderData = async () => {  
      if (!orderId) {  
        setError('Aucun ID de commande fourni');  
        setLoading(false);  
        return;  
      }  
  
      try {  
        setLoading(true);  
        setError(null);  
  
        // 🔧 MODIFIÉ: Utiliser api au lieu d'axios pour inclure le token automatiquement  
        const orderResponse = await api.get(`/commands/${orderId}`);  
        console.log('Données de commande:', orderResponse.data);  
          
        if (orderResponse.data.success) {  
          setOrderData(orderResponse.data.data);  
            
          // Si il y a une planification, chercher la livraison associée  
          if (orderResponse.data.data.planification) {  
            try {  
              // 🔧 MODIFIÉ: Utiliser api au lieu d'axios  
              const deliveryResponse = await api.get(`/livraisons/planification/${orderResponse.data.data.planification._id}`);  
              console.log('Données de livraison:', deliveryResponse.data);  
                
              if (deliveryResponse.data.success) {  
                setDeliveryData(deliveryResponse.data.data);  
              }  
            } catch (deliveryError) {  
              console.warn('Pas encore de livraison pour cette commande:', deliveryError);  
              // Pas d'erreur critique - la commande peut ne pas encore avoir de livraison  
            }  
          }  
        } else {  
          setError('Commande non trouvée');  
        }  
      } catch (error) {  
        console.error('Erreur lors du chargement des données:', error);  
        setError('Erreur de connexion au serveur');  
      } finally {  
        setLoading(false);  
      }  
    };  
  
    fetchOrderData();  
  }, [orderId]);  
  
  // Données basées uniquement sur les données réelles  
  const orderNumber = orderData?.command?.numero_commande || 'N/A';  
  
  // Informations du livreur depuis les données réelles uniquement  
  const deliveryDriver = deliveryData?.planification_id?.livreur_employee_id ? {  
    name: `${deliveryData.planification_id.livreur_employee_id.physical_user_id?.first_name || ''} ${deliveryData.planification_id.livreur_employee_id.physical_user_id?.last_name || ''}`.trim() || 'Chauffeur',  
    phone: deliveryData.planification_id.livreur_employee_id.physical_user_id?.telephone_principal || null,  
    vehicle: deliveryData.planification_id.trucks_id ?   
      `${deliveryData.planification_id.trucks_id.marque} - ${deliveryData.planification_id.trucks_id.matricule}` :   
      'Véhicule non spécifié'  
  } : null;  
  
  // Description du statut basée uniquement sur les données réelles  
  const getStatusDescription = () => {  
    if (deliveryData) {  
      switch(deliveryData.etat) {  
        case 'EN_COURS': return "Votre commande est en cours de livraison";  
        case 'LIVRE': return "Votre commande a été livrée avec succès";  
        case 'ECHEC': return "Problème lors de la livraison";  
        case 'PARTIELLE': return "Votre commande a été partiellement livrée";  
        case 'ANNULE': return "Livraison annulée";  
        default: return "Livraison en préparation";  
      }  
    }  
      
    // Basé sur les données de planification  
    if (orderData?.planification) {  
      switch(orderData.planification.etat) {  
        case 'PLANIFIE': return "Votre commande est prête pour la livraison";  
        case 'EN_COURS': return "Livraison en cours";  
        case 'LIVRE': return "Votre commande a été livrée";  
        case 'ANNULE': return "Commande annulée";  
        default: return "Commande planifiée";  
      }  
    }  
      
    // État de base de la commande  
    if (orderData?.command) {  
      return "Votre commande a été confirmée avec succès";  
    }  
      
    return "Chargement du statut...";  
  };  
  
  // Temps estimé basé sur les données réelles  
  const getEstimatedTime = () => {  
    if (deliveryData?.date_livraison_prevue) {  
      return new Date(deliveryData.date_livraison_prevue).toLocaleTimeString('fr-FR', {   
        hour: '2-digit',   
        minute: '2-digit'   
      });  
    }  
    if (orderData?.planification?.date_livraison_prevue) {  
      return new Date(orderData.planification.date_livraison_prevue).toLocaleTimeString('fr-FR', {   
        hour: '2-digit',   
        minute: '2-digit'   
      });  
    }  
    return null; // Pas de temps estimé disponible  
  };  
  
  // Écran de chargement  
  if (loading) {  
    return (  
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">  
        <div className="text-center">  
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>  
          <div className="text-lg">Chargement des informations de commande...</div>  
        </div>  
      </div>  
    );  
  }  
  
  // Écran d'erreur  
  if (error) {  
    return (  
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">  
        <div className="text-center">  
          <div className="text-red-500 mb-4">  
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">  
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />  
            </svg>  
          </div>  
          <h3 className="text-xl font-bold text-gray-900 mb-2">Erreur de chargement</h3>  
          <p className="text-gray-600 mb-4">{error}</p>  
          <button   
            onClick={() => window.location.reload()}   
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"  
          >  
            Réessayer  
          </button>  
        </div>  
      </div>  
    );  
  }  
  
  // Pas de données de commande  
  if (!orderData) {  
    return (  
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">  
        <div className="text-center">  
          <h3 className="text-xl font-bold text-gray-900 mb-2">Commande non trouvée</h3>  
          <p className="text-gray-600">Aucune commande trouvée avec cet identifiant.</p>  
        </div>  
      </div>  
    );  
  }  
  
  return (  
    <div className="track-wrapper">    
      <div className="track-container">    
        <div className="track-content">    
          <div className="track-page-content">   
            <div className="min-h-screen bg-gray-50">  
              <Title title="Suivre ma Commande" />  
  
              <div className="max-w-4xl mx-auto p-6">  
                <OrderStatusCard   
                  orderNumber={orderNumber}  
                  statusDescription={getStatusDescription()}  
                  estimatedTime={getEstimatedTime()}  
                />  
  
                <OrderProgress   
                  deliveryData={deliveryData}  
                  orderData={orderData}  
                />  
  
                {deliveryDriver && (  
                  <DeliveryDriverInfo   
                    driver={deliveryDriver}  
                    isVisible={true}  
                  />  
                )}  
  
                {/* Carte interactive seulement si livraison active */}  
                {deliveryData && deliveryData.etat === 'EN_COURS' && (  
                  <InteractiveMap  
                    deliveryId={deliveryData._id}  
                    isVisible={true}  
                    autoCenter={true}  
                    showRoute={true}  
                    updateInterval={10000}  
                  />  
                )}  
  
                <OrderSummary   
                  orderData={orderData}   
                  loading={false}   
                  error={null}   
                />  
  
                <CancelOrderButton  
                  orderId={orderData?.command?._id}  
                  currentStatus={orderData?.command?.statut_id?.code}  
                  onCancelSuccess={() => {  
                    // Recharger les données après annulation  
                    window.location.reload();  
                  }}  
                />  
              </div>  
            </div>  
          </div>    
        </div>    
      </div>    
    </div>   
  );  
};  
  
export default TrackOrder;
