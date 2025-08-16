const Planification = require('../models/Planification');  
const CommandeLine = require('../models/CommandeLine');  
const mongoose = require('mongoose');  
  
// Obtenir toutes les planifications avec filtres  
const getPlanifications = async (req, res) => {  
  try {  
    const { page = 1, limit = 20, etat, livreur_employee_id, trucks_id, dateFrom, dateTo, priority } = req.query;  
    const skip = (parseInt(page) - 1) * parseInt(limit);  
      
    const filter = {};  
    if (etat && etat !== 'all') {  
      filter.etat = etat.toUpperCase();  
    }  
    
    // ✅ MODIFIÉ: Logique pour récupérer les planifications par chauffeur ou par camion
    if (livreur_employee_id) {  
      // Si on spécifie un chauffeur, filtrer par chauffeur
      filter.livreur_employee_id = livreur_employee_id;  
    } else if (trucks_id) {
      // Si on spécifie un camion, filtrer par camion
      filter.trucks_id = trucks_id;
    }
    
    if (priority && priority !== 'all') {  
      filter.priority = priority;  
    }  
    if (dateFrom || dateTo) {  
      filter.delivery_date = {};  
      if (dateFrom) {  
        filter.delivery_date.$gte = new Date(dateFrom);  
      }  
      if (dateTo) {  
        filter.delivery_date.$lte = new Date(dateTo);  
      }  
    }  

    console.log('🔍 [DEBUG] Filtres appliqués:', filter);
  
    const planifications = await Planification.find(filter)  
      .populate({  
        path: 'commande_id',  
        populate: [  
          {  
            path: 'customer_id',  
            populate: [  
              { path: 'physical_user_id' },  
              { path: 'moral_user_id' }  
            ]  
          },  
          {  
            path: 'address_id',  
            populate: { path: 'city_id' }  
          }  
        ]  
      })  
      .populate('trucks_id')  
      .populate({  
        path: 'livreur_employee_id',  
        populate: { path: 'physical_user_id' }  
      })  
      .populate({  
        path: 'accompagnateur_id',  
        populate: { path: 'physical_user_id' }  
      })  
      .sort({ delivery_date: 1 })  
      .skip(skip)  
      .limit(parseInt(limit));  

    console.log('📋 [DEBUG] Planifications trouvées:', planifications.length);
  
    // Enrichir avec les lignes de commande  
    const planificationsComplete = await Promise.all(  
      planifications.map(async (planification) => {  
        const lignes = await CommandeLine.find({   
          commande_id: planification.commande_id._id   
        })  
        .populate('product_id', 'ref long_name short_name brand prix')  
        .populate('UM_id', 'unitemesure');  
  
        return {  
          ...planification.toObject(),  
          lignes  
        };  
      })  
    );  
  
    const count = await Planification.countDocuments(filter);  
  
    res.status(200).json({  
      success: true,  
      count,  
      data: planificationsComplete,  
      pagination: {  
        current_page: parseInt(page),  
        total_pages: Math.ceil(count / parseInt(limit)),  
        total_items: count,  
        items_per_page: parseInt(limit)  
      }  
    });  
  
  } catch (error) {  
    console.error('Erreur récupération planifications:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  
  
// Obtenir une planification par ID  
const getPlanificationById = async (req, res) => {  
  try {  
    const { id } = req.params;  
      
    if (!mongoose.Types.ObjectId.isValid(id)) {  
      return res.status(400).json({  
        success: false,  
        message: 'ID de planification invalide'  
      });  
    }  
  
    const planification = await Planification.findById(id)  
      .populate({  
        path: 'commande_id',  
        populate: [  
          { path: 'customer_id', populate: [{ path: 'physical_user_id' }, { path: 'moral_user_id' }] },  
          { path: 'address_id', populate: { path: 'city_id' } }  
        ]  
      })  
      .populate('trucks_id')  
      .populate({ path: 'livreur_employee_id', populate: { path: 'physical_user_id' } })  
      .populate({ path: 'accompagnateur_id', populate: { path: 'physical_user_id' } });  
  
    if (!planification) {  
      return res.status(404).json({  
        success: false,  
        message: 'Planification non trouvée'  
      });  
    }  
  
    // Récupérer les lignes de commande  
    const lignes = await CommandeLine.find({   
      commande_id: planification.commande_id._id   
    })  
    .populate('product_id', 'ref long_name short_name brand prix')  
    .populate('UM_id', 'unitemesure');  
  
    res.status(200).json({  
      success: true,  
      data: {  
        ...planification.toObject(),  
        lignes  
      }  
    });  
  
  } catch (error) {  
    console.error('Erreur récupération planification:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  

// ✅ NOUVEAU: Fonction pour créer une planification (assigner un camion)
const createPlanification = async (req, res) => {
  try {
    const { commande_id, truck_id, priority, delivery_date, livreur_employee_id, accompagnateur_id } = req.body;

    // Validation des données requises
    if (!commande_id || !truck_id || !delivery_date) {
      return res.status(400).json({
        success: false,
        message: 'commande_id, truck_id et delivery_date sont requis'
      });
    }

    // Vérifier si la commande existe déjà dans une planification
    const existingPlanification = await Planification.findOne({ commande_id });
    if (existingPlanification) {
      return res.status(400).json({
        success: false,
        message: 'Cette commande est déjà planifiée'
      });
    }

    // ✅ NOUVEAU: Récupérer le chauffeur assigné au camion si aucun n'est spécifié
    let finalLivreurId = livreur_employee_id;
    if (!finalLivreurId) {
      try {
        console.log('🚛 [DEBUG] Tentative d\'auto-assignation du chauffeur...');
        const Truck = require('../models/Truck');
        const truck = await Truck.findById(truck_id).populate('driver');
        console.log('🚛 [DEBUG] Camion trouvé:', truck ? 'OUI' : 'NON');
        
        if (truck) {
          console.log('🚛 [DEBUG] Détails du camion:', {
            id: truck._id,
            matricule: truck.matricule,
            driver: truck.driver,
            driverId: truck.driver?._id
          });
        }
        
        if (truck && truck.driver) {
          finalLivreurId = truck.driver._id;
          console.log('✅ [DEBUG] Chauffeur auto-assigné:', finalLivreurId);
        } else {
          console.log('⚠️ [DEBUG] Aucun chauffeur trouvé pour ce camion');
        }
      } catch (error) {
        console.error('❌ [ERROR] Erreur lors de la récupération du chauffeur du camion:', error);
      }
    } else {
      console.log('👤 [DEBUG] Chauffeur déjà spécifié:', finalLivreurId);
    }

    // Créer la nouvelle planification
    const planification = new Planification({
      commande_id,
      trucks_id: truck_id,
      delivery_date: new Date(delivery_date),
      priority: priority || 'medium',
      livreur_employee_id: finalLivreurId,
      accompagnateur_id: accompagnateur_id || null,
      etat: 'PLANIFIE'
    });

    await planification.save();

    console.log('✅ [DEBUG] Planification créée avec ID:', planification._id);

    // Populate les références pour la réponse
    const populatedPlanification = await Planification.findById(planification._id)
      .populate({
        path: 'commande_id',
        populate: [
          {
            path: 'customer_id',
            populate: [
              { path: 'physical_user_id' },
              { path: 'moral_user_id' }
            ]
          },
          {
            path: 'address_id',
            populate: { path: 'city_id' }
          }
        ]
      })
      .populate('trucks_id')
      .populate({
        path: 'livreur_employee_id',
        populate: { path: 'physical_user_id' }
      })
      .populate({
        path: 'accompagnateur_id',
        populate: { path: 'physical_user_id' }
      });

    res.status(201).json({
      success: true,
      message: 'Planification créée avec succès',
      data: populatedPlanification
    });

  } catch (error) {
    console.error('❌ Erreur création planification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ✅ NOUVEAU: Fonction pour supprimer une planification par commande_id
const deletePlanificationByCommande = async (req, res) => {
  try {
    const { commandeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commandeId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de commande invalide'
      });
    }

    const planification = await Planification.findOneAndDelete({ commande_id: commandeId });

    if (!planification) {
      return res.status(404).json({
        success: false,
        message: 'Aucune planification trouvée pour cette commande'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Planification supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur suppression planification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
  
module.exports = {  
  getPlanifications,  
  getPlanificationById,
  createPlanification,
  deletePlanificationByCommande
};