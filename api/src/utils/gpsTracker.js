// chronogaz_back/utils/gpsTracker.js
const Livraison = require('../models/Livraison');
const UserAddress = require('../models/UserAddress');
const Address = require('../models/Address');

// Fonction pour enregistrer et diffuser une position GPS
const updateDriverPosition = async (deliveryId, latitude, longitude, io) => {
  try {
    console.log(`🔍 [GPS] Recherche livraison avec deliveryId: ${deliveryId}`);
    
    // ✅ Chercher d'abord par _id (ID de livraison), puis par planification_id
    let livraison = await Livraison.findById(deliveryId)
      .populate({
        path: 'planification_id',
        populate: {
          path: 'livreur_employee_id',
          populate: {
            path: 'physical_user_id'
          }
        }
      });
    
    if (!livraison) {
      console.log(`🔍 [GPS] Livraison non trouvée par _id, recherche par planification_id...`);
      livraison = await Livraison.findOne({ planification_id: deliveryId })
        .populate({
          path: 'planification_id',
          populate: {
            path: 'livreur_employee_id',
            populate: {
              path: 'physical_user_id'
            }
          }
        });
    }
    
    if (!livraison) {
      throw new Error(`Livraison non trouvée avec deliveryId: ${deliveryId}`);
    }

    console.log(`✅ [GPS] Livraison trouvée: ${livraison._id}`);

    // ✅ Mise à jour de la position directement dans le document Livraison
    livraison.latitude = parseFloat(latitude);
    livraison.longitude = parseFloat(longitude);
    livraison.updatedAt = new Date();
    await livraison.save();

    // ✅ OPTIONNEL: Également mettre à jour l'adresse du livreur si nécessaire
    if (livraison.planification_id?.livreur_employee_id?.physical_user_id?._id) {
      try {
        const livreurId = livraison.planification_id.livreur_employee_id.physical_user_id._id;
        
        const userAddress = await UserAddress.findOne({
          physical_user_id: livreurId,
          is_principal: false
        }).populate('address_id');

        if (userAddress && userAddress.address_id) {
          userAddress.address_id.latitude = parseFloat(latitude);
          userAddress.address_id.longitude = parseFloat(longitude);
          userAddress.address_id.updatedAt = new Date();
          await userAddress.address_id.save();
          console.log(`📍 [GPS] Adresse du livreur mise à jour`);
        } else {
          console.log(`⚠️ [GPS] Pas d'adresse secondaire trouvée pour le livreur ${livreurId}`);
          // On ne crée pas de nouvelle adresse pour éviter les erreurs de validation
          // La position est déjà sauvée dans la livraison, c'est suffisant
        }
      } catch (addressError) {
        console.error(`⚠️ [GPS] Erreur mise à jour adresse livreur:`, addressError.message);
        // On continue même si la mise à jour de l'adresse échoue
        // car la position est déjà sauvée dans la livraison
      }
    }

    // ✅ Diffuser la mise à jour via WebSocket
    if (io) {
      const positionUpdate = {
        deliveryId: livraison._id.toString(),
        planificationId: livraison.planification_id._id.toString(),
        position: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        timestamp: new Date().toISOString()
      };

      // Diffuser vers les deux types de rooms pour compatibilité
      io.to(`delivery_${livraison._id}`).emit('position_updated', positionUpdate);
      io.to(`delivery_${livraison.planification_id._id}`).emit('position_updated', positionUpdate);
      
      // Utiliser aussi broadcastToDelivery si disponible
      if (io.broadcastToDelivery) {
        io.broadcastToDelivery(livraison._id.toString(), 'position_updated', positionUpdate);
      }
      
      console.log(`📤 [GPS] Position diffusée vers les rooms ${livraison._id} et ${livraison.planification_id._id}`);
    }

    return {
      success: true,
      position: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    };

  } catch (error) {
    console.error('Erreur mise à jour position:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction pour récupérer la dernière position d'un livreur
const getLastDriverPosition = async (livraisonId) => {
  try {
    const livraison = await Livraison.findById(livraisonId)
      .populate({
        path: 'planification_id',
        populate: {
          path: 'livreur_id',
          populate: {
            path: 'physical_user_id'
          }
        }
      });

    if (!livraison) {
      return null;
    }

    const livreurId = livraison.planification_id.livreur_id.physical_user_id._id;

    const userAddress = await UserAddress.findOne({
      physical_user_id: livreurId,
      is_principal: false
    })
    .populate('address_id')
    .sort({ updatedAt: -1 });

    if (userAddress && userAddress.address_id) {
      return {
        latitude: userAddress.address_id.latitude,
        longitude: userAddress.address_id.longitude,
        timestamp: userAddress.address_id.updatedAt
      };
    }

    return null;
  } catch (error) {
    console.error('Erreur récupération position:', error);
    return null;
  }
};

module.exports = {
  updateDriverPosition,
  getLastDriverPosition
};