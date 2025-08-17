import React from "react";    
import { useState, useEffect } from "react";    
import api from '../../services/api';  
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
  const [orderData, setOrderData] = useState(null);    
  const [loading, setLoading] = useState(true);    
  const [error, setError] = useState(null);    
    
  const { orderId } = useParams();    
    
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
    
        const orderResponse = await api.get(`/commands/${orderId}`);    
        console.log('Données de commande:', orderResponse.data);    
            
        if (orderResponse.data.success) {    
          setOrderData(orderResponse.data.data);    
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
    
  const orderNumber = orderData?.command?.numero_commande || 'N/A';    
    
  // ✅ CORRIGÉ: Utiliser les données de planification et livraison depuis orderData
  const deliveryDriver = orderData?.planification?.livreur_employee_id ? {    
    name: `${orderData.planification.livreur_employee_id.physical_user_id?.first_name || ''} ${orderData.planification.livreur_employee_id.physical_user_id?.last_name || ''}`.trim() || 'Chauffeur',    
    phone: orderData.planification.livreur_employee_id.physical_user_id?.telephone_principal || null,    
    vehicle: orderData.planification.trucks_id ?     
      `${orderData.planification.trucks_id.matricule}` :     
      'Véhicule non spécifié'    
  } : null;    
    
  // ✅ CORRIGÉ: Description du statut basée sur votre nouvelle architecture  
  const getStatusDescription = () => {  
    // Priorité 1: État de la commande (source de vérité)  
    if (orderData?.command?.statut) {  
      switch(orderData.command.statut) {  
        case 'CONFIRMEE': return "Votre commande a été confirmée avec succès";  
        case 'ASSIGNEE': return "Votre commande est prête pour la livraison";  
        case 'EN_COURS': return "Votre commande est en cours de livraison";  
        case 'LIVREE': return "Votre commande a été livrée avec succès";  
        case 'ANNULEE': return "Commande annulée";  
        case 'ECHOUEE': return "Problème lors de la livraison";  
        default: return "Suivi de votre commande";  
      }  
    }  
  
    // Fallback: État de livraison  
    if (orderData?.livraison) {  
      switch(orderData.livraison.etat) {  
        case 'EN_COURS': return "Votre commande est en cours de livraison";  
        case 'LIVRE': return "Votre commande a été livrée avec succès";  
        case 'ECHEC': return "Problème lors de la livraison";  
        case 'ANNULE': return "Livraison annulée";  
        default: return "Livraison en préparation";  
      }  
    }  
  
    return "Chargement du statut...";  
  };  
    
  const getEstimatedTime = () => {    
    if (orderData?.livraison?.updatedAt && orderData.command.statut === 'LIVREE') {    
      return new Date(orderData.livraison.updatedAt).toLocaleTimeString('fr-FR', {     
        hour: '2-digit',     
        minute: '2-digit'     
      });    
    }    
    if (orderData?.planification?.delivery_date) {    
      return new Date(orderData.planification.delivery_date).toLocaleTimeString('fr-FR', {     
        hour: '2-digit',     
        minute: '2-digit'     
      });    
    }    
    return null;  
  };    
    
  // États de chargement et d'erreur (restent identiques)  
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
    
                {/* ✅ CORRIGÉ: Passer les bonnes données de livraison */}
                <OrderProgress     
                  deliveryData={orderData?.livraison}    
                  orderData={orderData}    
                />    
    
                {deliveryDriver && (    
                  <DeliveryDriverInfo     
                    driver={deliveryDriver}    
                    isVisible={true}    
                  />    
                )}    
    
                {/* ✅ CORRIGÉ: Vérifier l'état de livraison depuis orderData */}
                {orderData?.livraison && orderData.livraison.etat === 'EN_COURS' && (    
                  <InteractiveMap    
                    deliveryId={orderData.livraison._id}    
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
                  currentStatus={orderData?.command?.statut}    
                  onCancelSuccess={() => {    
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
