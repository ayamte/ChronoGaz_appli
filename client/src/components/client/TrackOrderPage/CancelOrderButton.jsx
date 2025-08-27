import React from 'react';  
import axios from 'axios';  
  
const CancelOrderButton = ({ orderId, currentStatus, onCancelSuccess }) => {  
  const handleCancelOrder = async () => {  
    if (!orderId) {  
      console.warn('Aucun ID de commande fourni');  
      return;  
    }  
  
    const confirm = window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?");  
    if (!confirm) return;  
  
    try {  
      // Utiliser l'endpoint correct pour l'annulation  
      const response = await axios.put(`http://localhost:5000/api/commands/${orderId}/cancel`, {  
        raison_annulation: 'Annulation demandée par le client'  
      });  
  
      if (response.data.success) {  
        alert("Commande annulée avec succès !");  
        if (typeof onCancelSuccess === 'function') {  
          onCancelSuccess();  
        }  
      } else {  
        alert(response.data.message || "Erreur lors de l'annulation.");  
      }  
  
    } catch (error) {  
      console.error("Erreur d'annulation :", error);  
        
      // Gestion d'erreur plus détaillée  
      const errorMessage = error.response?.data?.message || "Erreur lors de l'annulation de la commande.";  
      alert(errorMessage);  
    }  
  };  
  
  // Vérifier les statuts qui permettent l'annulation  
  const canCancel = () => {  
    // Basé sur la logique du contrôleur backend  
    const cancelableStatuses = ['NOUVELLE', 'CONFIRMEE'];  
    return cancelableStatuses.includes(currentStatus);  
  };  
  
  // N'affiche pas le bouton si le statut ne permet pas l'annulation  
  if (!canCancel()) return null;  
  
  return (  
    <div className="mb-6">  
      <button  
        onClick={handleCancelOrder}  
        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"  
        disabled={!orderId}  
      >  
        Annuler la commande  
      </button>  
    </div>  
  );  
};  
  
export default CancelOrderButton;