
import React from "react";  
import ProgressStep from '../TrackOrderPage/ProgressStep';  
  
// Fonction pour générer les étapes personnalisées selon vos spécifications  
const generateCustomStatusSteps = (deliveryData, orderData) => {  
  const formatTime = (date) => {  
    if (!date) return "En attente";  
    try {  
      return new Date(date).toLocaleString('fr-FR', {   
        day: '2-digit',  
        month: '2-digit',   
        year: 'numeric',  
        hour: '2-digit',   
        minute: '2-digit'   
      });  
    } catch (error) {  
      return "En attente";  
    }  
  };  
  
  // Étape 1: Commande confirmée (toujours complétée)  
  const steps = [  
    {  
      id: 0,  
      title: "Commande confirmée",  
      iconType: "check",  
      time: formatTime(orderData?.command?.date_commande || orderData?.command?.createdAt),  
      description: "Votre commande a été confirmée avec succès",  
      status: 'COMPLETED'  
    }  
  ];  
  
  // Étape 2: Préparation terminée (quand admin affecte un camion)  
  const hasAssignment = orderData?.planification || deliveryData?.planification_id;  
  steps.push({  
    id: 1,  
    title: "Préparation terminée",  
    iconType: "package",  
    time: hasAssignment ? formatTime(orderData?.planification?.createdAt || deliveryData?.planification_id?.createdAt) : "En attente",  
    description: hasAssignment ? "Votre commande est prête et un camion a été assigné" : "Préparation de votre commande en cours",  
    status: hasAssignment ? 'COMPLETED' : 'PENDING'  
  });  
  
  // Étape 3: Livraison en cours (quand chauffeur démarre)  
  const isDeliveryStarted = deliveryData?.etat === 'EN_COURS';  
  const isDeliveryCompleted = deliveryData?.etat === 'LIVRE';  
  const isDeliveryFailed = deliveryData?.etat === 'ECHEC';  
  const isDeliveryPartial = deliveryData?.etat === 'PARTIELLE';  
  
  if (isDeliveryStarted || isDeliveryCompleted || isDeliveryFailed || isDeliveryPartial) {  
    steps.push({  
      id: 2,  
      title: "Livraison en cours",  
      iconType: "truck",  
      time: formatTime(deliveryData?.createdAt),  
      description: "Le chauffeur est en route vers votre adresse",  
      status: isDeliveryStarted ? 'CURRENT' : 'COMPLETED'  
    });  
  } else if (hasAssignment) {  
    steps.push({  
      id: 2,  
      title: "Livraison en cours",  
      iconType: "truck",  
      time: "En attente",  
      description: "En attente du démarrage de la livraison",  
      status: 'PENDING'  
    });  
  }  
  
  // Étape 4: Commande livrée ou annulée  
  if (isDeliveryCompleted) {  
    steps.push({  
      id: 3,  
      title: "Commande livrée",  
      iconType: "check",  
      time: formatTime(deliveryData?.date_livraison || deliveryData?.updatedAt),  
      description: "Votre commande a été livrée avec succès",  
      status: 'COMPLETED'  
    });  
  } else if (isDeliveryFailed) {  
    steps.push({  
      id: 3,  
      title: "Commande annulée",  
      iconType:       "warning",  
      time: formatTime(deliveryData?.date_livraison || deliveryData?.updatedAt),  
      description: "Livraison annulée - Contactez le service client",  
      status: 'ECHEC'  
    });  
  } else if (isDeliveryPartial) {  
    steps.push({  
      id: 3,  
      title: "Livraison partielle",  
      iconType: "partial",  
      time: formatTime(deliveryData?.date_livraison || deliveryData?.updatedAt),  
      description: "Livraison partiellement effectuée",  
      status: 'PARTIELLE'  
    });  
  }  
  
  return steps;  
};  
  
const OrderProgress = ({   
  orderStatus,   
  deliveryData,   
  orderData  
}) => {  
  // Générer les étapes personnalisées  
  const statusSteps = generateCustomStatusSteps(deliveryData, orderData);  
  
  return (  
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">  
      <h3 className="text-xl font-bold mb-6" style={{color: '#245FA6'}}>  
        Progression de votre commande  
      </h3>  
        
      <div className="space-y-4">  
        {statusSteps.map((step, index) => {  
          const isCompleted = step.status === 'COMPLETED';  
          const isCurrent = step.status === 'CURRENT';  
          const isLast = index === statusSteps.length - 1;  
  
          return (  
            <ProgressStep  
              key={step.id}  
              step={step}  
              isCompleted={isCompleted || isCurrent}  
              isCurrent={isCurrent}  
              isLast={isLast}  
            />  
          );  
        })}  
      </div>  
    </div>  
  );  
};  
  
export default OrderProgress;  