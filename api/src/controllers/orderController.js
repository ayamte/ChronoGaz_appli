const Command = require('../models/Commande');    
const CommandeLine = require('../models/CommandeLine');    
const Planification = require('../models/Planification');    
const Livraison = require('../models/Livraison');    
const LivraisonLine = require('../models/LivraisonLine');    
const Address = require('../models/Address');    
const UserAddress = require('../models/UserAddress');    
const Customer = require('../models/Customer');    
const City = require('../models/City');     
const Product = require('../models/Product');    
const Um = require('../models/Um');    
const mongoose = require('mongoose');    
const Truck = require('../models/Truck');

// ✅ CORRIGÉ: Récupérer toutes les commandes avec filtres basés sur les statuts de commande
const getCommands = async (req, res) => {    
  try {    
    const { page = 1, limit = 20, status, search, priority, dateFrom, dateTo, customerId } = req.query;    
        
    const filter = {};    
    const skip = (parseInt(page) - 1) * parseInt(limit);    
        
    // ✅ NOUVEAU: Filtre basé sur le statut de commande directement
    if (status && status !== 'all') {    
      const statusToCommandeState = {    
        'pending': 'CONFIRMEE',
        'assigned': 'ASSIGNEE',    
        'in_progress': 'EN_COURS',     
        'delivered': 'LIVREE',    
        'cancelled': ['ANNULEE', 'ECHOUEE']
      };    
          
      if (statusToCommandeState[status]) {
        if (Array.isArray(statusToCommandeState[status])) {
          filter.statut = { $in: statusToCommandeState[status] };
        } else {
          filter.statut = statusToCommandeState[status];
        }
      }
    }    
        
    if (customerId && mongoose.Types.ObjectId.isValid(customerId)) {    
      filter.customer_id = customerId;    
    }    
        
    if (search) {    
      filter.$or = [    
        { numero_commande: { $regex: search, $options: 'i' } }    
      ];    
    }    
        
    if (dateFrom || dateTo) {    
      filter.date_commande = {};    
      if (dateFrom) {    
        filter.date_commande.$gte = new Date(dateFrom);    
      }    
      if (dateTo) {    
        filter.date_commande.$lte = new Date(dateTo);    
      }    
    }    
        
    // ✅ NOUVEAU: Filtre de priorité basé sur la planification (garde la logique existante)
    if (priority && priority !== 'all') {    
      const planificationsIds = await Planification.find({     
        priority: priority     
      }).distinct('commande_id');    
          
      if (filter._id) {    
        filter._id = { $in: filter._id.$in ?     
          filter._id.$in.filter(id => planificationsIds.includes(id.toString())) :     
          planificationsIds     
        };    
      } else {    
        filter._id = { $in: planificationsIds };    
      }    
    }    
    
    const commandes = await Command.find(filter)    
      .populate({    
        path: 'customer_id',    
        select: 'customer_code type_client physical_user_id moral_user_id',    
        populate: [    
          {    
            path: 'physical_user_id',    
            select: 'first_name last_name telephone_principal'    
          },    
          {    
            path: 'moral_user_id',    
            select: 'raison_sociale telephone_principal'    
          }    
        ]    
      })    
      .populate({    
        path: 'address_id',    
        select: 'street numappt numimmeuble quartier city_id latitude longitude',    
        populate: [    
          {    
            path: 'city_id',    
            select: 'name code'    
          }    
        ]    
      })    
      .sort({ date_commande: -1 })    
      .skip(skip)    
      .limit(parseInt(limit));    
    
    const count = await Command.countDocuments(filter);    
    
    // Enrichir avec les planifications et livraisons    
    const commandesComplete = await Promise.all(    
      commandes.map(async (commande) => {    
        const planification = await Planification.findOne({ commande_id: commande._id })    
          .populate('trucks_id', 'matricule marque capacite')    
          .populate({    
            path: 'livreur_employee_id',    
            select: 'matricule fonction physical_user_id',    
            populate: {    
              path: 'physical_user_id',    
              select: 'first_name last_name'    
            }    
          });    
    
        const livraison = planification ?     
          await Livraison.findOne({ planification_id: planification._id }) : null;    
    
        const lignesCount = await CommandeLine.countDocuments({ commande_id: commande._id });    
    
        return {    
          ...commande.toObject(),    
          planification,    
          livraison,    
          total_articles: lignesCount    
        };    
      })    
    );    
    
    res.status(200).json({    
      success: true,    
      count: count,    
      data: commandesComplete,    
      pagination: {    
        current_page: parseInt(page),    
        total_pages: Math.ceil(count / parseInt(limit)),    
        total_items: count,    
        items_per_page: parseInt(limit)    
      }    
    });    
    
  } catch (error) {    
    console.error('Erreur lors de la récupération des commandes:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// Récupérer une commande par ID (reste identique)
const getCommandById = async (req, res) => {  
  try {  
    const { id } = req.params;  
      
    if (!mongoose.Types.ObjectId.isValid(id)) {  
      return res.status(400).json({  
        success: false,  
        message: 'ID de commande invalide'  
      });  
    }  
      
    const command = await Command.findById(id)  
      .populate({  
        path: 'customer_id',  
        select: 'customer_code type_client physical_user_id moral_user_id',  
        populate: [  
          {  
            path: 'physical_user_id',  
            select: 'first_name last_name telephone_principal'  
          },  
          {  
            path: 'moral_user_id',  
            select: 'raison_sociale telephone_principal'  
          }  
        ]  
      })  
      .populate({  
        path: 'address_id',  
        select: 'street numappt numimmeuble quartier city_id latitude longitude telephone instructions_livraison',  
        populate: [  
          {  
            path: 'city_id',  
            select: 'name code'  
          }  
        ]  
      });  
  
    if (!command) {  
      return res.status(404).json({  
        success: false,  
        message: 'Commande non trouvée'  
      });  
    }  
  
    const lignesCommande = await CommandeLine.find({ commande_id: id })  
      .populate('product_id', 'ref long_name short_name brand gamme prix')  
      .populate('UM_id', 'unitemesure');  
  
    const planification = await Planification.findOne({ commande_id: id })  
      .populate('trucks_id', 'matricule marque')  
      .populate({  
        path: 'livreur_employee_id',  
        select: 'matricule fonction physical_user_id',  
        populate: {  
          path: 'physical_user_id',  
          select: 'first_name last_name'  
        }  
      })  
      .populate({  
        path: 'accompagnateur_id',  
        select: 'matricule physical_user_id',  
        populate: {  
          path: 'physical_user_id',  
          select: 'first_name last_name'  
        }  
      });  
  
    res.status(200).json({  
      success: true,  
      data: {  
        command,  
        lignes: lignesCommande,  
        planification  
      }  
    });  
  
  } catch (error) {  
    console.error('Erreur lors de la récupération de la commande:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  

// Créer une nouvelle commande (reste identique)
const createCommand = async (req, res) => {  
  try {  
    const {  
      customer_id,  
      address,  
      details,  
      urgent,  
      lignes,  
      date_souhaite  
    } = req.body;  
  
    if (!customer_id) {  
      return res.status(400).json({  
        success: false,  
        message: 'Le champ customer_id est obligatoire'  
      });  
    }  
  
    if (!lignes || !Array.isArray(lignes) || lignes.length === 0) {  
      return res.status(400).json({  
        success: false,  
        message: 'Au moins une ligne de commande est requise'  
      });  
    }  
  
    const customer = await Customer.findById(customer_id);  
    if (!customer) {  
      return res.status(400).json({  
        success: false,  
        message: 'Client non trouvé'  
      });  
    }  
  
    let finalAddressId;  
  
    if (address.use_existing_address && address.address_id) {  
      finalAddressId = address.address_id;  
        
      const userAddress = await UserAddress.findOne({  
        [customer.type_client === 'PHYSIQUE' ? 'physical_user_id' : 'moral_user_id']:   
          customer.type_client === 'PHYSIQUE' ? customer.physical_user_id : customer.moral_user_id,  
        address_id: finalAddressId  
      });  
  
      if (!userAddress) {  
        return res.status(400).json({  
          success: false,  
          message: 'Adresse non autorisée pour ce client'  
        });  
      }  
    } else if (address.new_address) {  
      const casablancaCity = await City.findOne({ name: 'Casablanca' });  
        
      const newAddress = new Address({  
        user_id: customer_id,  
        street: address.new_address.street,  
        numappt: address.new_address.numappt,  
        numimmeuble: address.new_address.numimmeuble,  
        quartier: address.new_address.quartier,  
        city_id: casablancaCity?._id,  
        postal_code: address.new_address.postal_code,  
        type_adresse: address.new_address.type_adresse || 'LIVRAISON',  
        latitude: address.new_address.latitude,  
        longitude: address.new_address.longitude,  
        telephone: address.new_address.telephone,  
        instructions_livraison: address.new_address.instructions_livraison  
      });  
  
      const savedAddress = await newAddress.save();  
      finalAddressId = savedAddress._id;  
  
      const userAddress = new UserAddress({  
        [customer.type_client === 'PHYSIQUE' ? 'physical_user_id' : 'moral_user_id']:   
          customer.type_client === 'PHYSIQUE' ? customer.physical_user_id : customer.moral_user_id,  
        address_id: finalAddressId,  
        is_principal: false  
      });  
      await userAddress.save();  
    } else {  
      return res.status(400).json({  
        success: false,  
        message: 'Informations d\'adresse manquantes'  
      });  
    }  
  
    for (const ligne of lignes) {  
      if (!ligne.product_id || !ligne.UM_id || !ligne.quantity || !ligne.price) {  
        return res.status(400).json({  
          success: false,  
          message: 'Chaque ligne doit contenir product_id, UM_id, quantity et price'  
        });  
      }  
  
      const product = await Product.findById(ligne.product_id);  
      if (!product) {  
        return res.status(400).json({  
          success: false,  
          message: `Produit non trouvé: ${ligne.product_id}`  
        });  
      }  
  
      const um = await Um.findById(ligne.UM_id);  
      if (!um) {  
        return res.status(400).json({  
          success: false,  
          message: `Unité de mesure non trouvée: ${ligne.UM_id}`  
        });  
      }  
    }  
  
    let montant_total = lignes.reduce((total, ligne) => {  
      return total + (ligne.quantity * ligne.price);  
    }, 0);  
  
    const fraisLivraison = 20;  
    montant_total += fraisLivraison;  
  
    const nouvelleCommande = new Command({  
      customer_id: new mongoose.Types.ObjectId(customer_id),  
      address_id: finalAddressId,  
      details,  
      urgent: urgent || false,  
      montant_total,  
      date_souhaite: date_souhaite ? new Date(date_souhaite) : null  
    });  
  
    const commandeSauvegardee = await nouvelleCommande.save();  
  
    const lignesCommande = lignes.map(ligne => ({  
      commande_id: commandeSauvegardee._id,  
      product_id: ligne.product_id,  
      UM_id: ligne.UM_id,  
      quantity: ligne.quantity,  
      price: ligne.price  
    }));  
  
    await CommandeLine.insertMany(lignesCommande);  
  
    const commandeComplete = await Command.findById(commandeSauvegardee._id)  
      .populate('customer_id', 'customer_code type_client')  
      .populate({  
        path: 'address_id',  
        select: 'street numappt numimmeuble quartier city_id latitude longitude',  
        populate: [  
          {  
            path: 'city_id',  
            select: 'name code'  
          }  
        ]  
      });  
  
    res.status(201).json({  
      success: true,  
      message: 'Commande créée avec succès',  
      data: commandeComplete  
    });  
  
  } catch (error) {  
    console.error('Erreur lors de la création de la commande:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  

// ✅ CORRIGÉ: Annuler une commande basé sur le statut de commande
const cancelOrder = async (req, res) => {    
  try {    
    const { id } = req.params;    
    const { raison_annulation } = req.body;    
    
    if (!mongoose.Types.ObjectId.isValid(id)) {    
      return res.status(400).json({    
        success: false,    
        message: 'ID de commande invalide'    
      });    
    }    
    
    const commande = await Command.findById(id);    
    if (!commande) {    
      return res.status(404).json({    
        success: false,    
        message: 'Commande non trouvée'    
      });    
    }    
    
    // ✅ NOUVEAU: Vérifier l'état de la commande directement
    const etatsNonAnnulables = ['EN_COURS', 'LIVREE'];
    if (etatsNonAnnulables.includes(commande.statut)) {
      return res.status(400).json({
        success: false,
        message: `Impossible d'annuler une commande avec le statut "${commande.statut}"`
      });
    }
    
    // Annuler la planification si elle existe
    const planification = await Planification.findOne({ commande_id: id });
    if (planification && planification.etat === 'PLANIFIE') {
      planification.etat = 'ANNULE';
      planification.raison_annulation = raison_annulation;
      await planification.save();
      // La synchronisation avec la commande se fait automatiquement via le middleware
    }
    
    res.status(200).json({    
      success: true,    
      message: 'Commande annulée avec succès',    
      data: commande    
    });    
    
  } catch (error) {    
    console.error('Erreur lors de l\'annulation de la commande:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// Récupérer les commandes par client (reste identique)
const getCommandsByCustomerId = async (req, res) => {    
  try {    
    const { customerId } = req.params;    
        
    if (!mongoose.Types.ObjectId.isValid(customerId)) {    
      return res.status(400).json({    
        success: false,    
        message: 'ID client invalide'    
      });    
    }    
        
    const commands = await Command.find({ customer_id: customerId })    
      .populate({    
        path: 'address_id',    
        select: 'street numappt numimmeuble quartier city_id latitude longitude',    
        populate: [    
          {    
            path: 'city_id',    
            select: 'name code'    
          }    
        ]    
      })    
      .sort({ date_commande: -1 });    
    
    const commandsWithLines = await Promise.all(    
      commands.map(async (command) => {    
        const lignes = await CommandeLine.find({ commande_id: command._id })    
          .populate('product_id', 'ref long_name short_name brand gamme prix')    
          .populate('UM_id', 'unitemesure');    
  
        const planification = await Planification.findOne({ commande_id: command._id })  
          .populate('trucks_id', 'matricule marque')  
          .populate({  
            path: 'livreur_employee_id',  
            select: 'matricule fonction physical_user_id',  
            populate: {  
              path: 'physical_user_id',  
              select: 'first_name last_name'  
            }  
          });  
    
        return {    
          ...command.toObject(),    
          lignes,  
          planification  
        };    
      })    
    );    
    
    res.status(200).json({    
      success: true,    
      data: commandsWithLines    
    });    
    
  } catch (error) {    
    console.error('Erreur récupération commandes client:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// Mettre à jour une commande (reste identique)
const updateCommandById = async (req, res) => {    
  try {    
    const { id } = req.params;    
    const updateData = req.body;    
    
    if (!mongoose.Types.ObjectId.isValid(id)) {    
      return res.status(400).json({    
        success: false,    
        message: 'ID de commande invalide'    
      });    
    }    
    
    const commandeMiseAJour = await Command.findByIdAndUpdate(    
      id,    
      updateData,    
      { new: true, runValidators: true }    
    );    
    
    if (!commandeMiseAJour) {    
      return res.status(404).json({    
        success: false,    
        message: 'Commande non trouvée'    
      });    
    }    
    
    const commandeComplete = await Command.findById(id)    
      .populate('customer_id', 'customer_code type_client')    
      .populate({    
        path: 'address_id',    
        select: 'street numappt numimmeuble quartier city_id latitude longitude',    
        populate: [    
          {    
            path: 'city_id',    
            select: 'name code'    
          }    
        ]    
      });    
    
    res.status(200).json({    
      success: true,    
      message: 'Commande mise à jour avec succès',    
      data: commandeComplete    
    });    
    
  } catch (error) {    
    console.error('Erreur lors de la mise à jour de la commande:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// ✅ CORRIGÉ: Mettre à jour le statut d'une commande avec validation
const updateCommandStatus = async (req, res) => {  
  try {  
    const { id } = req.params;  
    const { truck_id, delivery_date, priority } = req.body;
      
    if (!mongoose.Types.ObjectId.isValid(id)) {  
      return res.status(400).json({  
        success: false,  
        message: 'ID de commande invalide'  
      });  
    }  
      
    if (!truck_id || !delivery_date) {  
      return res.status(400).json({  
        success: false,  
        message: 'truck_id et delivery_date sont requis pour planifier la commande'  
      });  
    }  

    // ✅ NOUVEAU: Vérifier que la commande est dans un état planifiable
    const commande = await Command.findById(id);
    if (!commande) {
      return res.status(404).json({
        success: false,
        message: 'Commande non trouvée'
      });
    }

    // ✅ NOUVEAU: Vérifier les états autorisés pour la planification
    const etatsAutorisesPlanning = ['CONFIRMEE', 'ASSIGNEE'];
    if (!etatsAutorisesPlanning.includes(commande.statut)) {
      return res.status(400).json({
        success: false,
        message: `Impossible de planifier une commande avec le statut "${commande.statut}"`
      });
    }
      
    const truck = await Truck.findById(truck_id)  
      .populate('driver')  
      .populate('accompagnant');  
      
    if (!truck) {  
      return res.status(400).json({  
        success: false,  
        message: 'Camion non trouvé'  
      });  
    }  
  
    if (!truck.driver) {  
      return res.status(400).json({  
        success: false,  
        message: 'Ce camion n\'a pas de chauffeur assigné'  
      });  
    }  
  
    const livreur_employee_id = truck.driver._id;  
    const accompagnateur_id = truck.accompagnant ? truck.accompagnant._id : null;  
      
    const planificationExistante = await Planification.findOne({ commande_id: id });  
      
    if (planificationExistante) {  
      // ✅ NOUVEAU: Vérifier que la planification peut être modifiée
      if (planificationExistante.etat === 'ANNULE') {
        return res.status(400).json({
          success: false,
          message: 'Impossible de modifier une planification annulée'
        });
      }

      planificationExistante.trucks_id = truck_id;  
      planificationExistante.livreur_employee_id = livreur_employee_id;  
      planificationExistante.accompagnateur_id = accompagnateur_id;
      planificationExistante.delivery_date = delivery_date;  
      planificationExistante.priority = priority || 'medium';  
      planificationExistante.etat = 'PLANIFIE';  
        
      await planificationExistante.save();
      // La synchronisation avec la commande se fait automatiquement via le middleware
        
      return res.status(200).json({  
        success: true,  
        message: 'Planification mise à jour avec succès',  
        data: { planification: planificationExistante }  
      });  
    } else {  
      const nouvellePlanification = new Planification({  
        commande_id: id,  
        trucks_id: truck_id,  
        livreur_employee_id: livreur_employee_id,
        accompagnateur_id: accompagnateur_id,
        delivery_date,  
        priority: priority || 'medium',  
        etat: 'PLANIFIE'  
      });  
        
      await nouvellePlanification.save();
      // La synchronisation avec la commande se fait automatiquement via le middleware
        
      return res.status(200).json({  
        success: true,  
        message: 'Commande planifiée avec succès',  
        data: { planification: nouvellePlanification }  
      });  
    }  
      
  } catch (error) {  
    console.error('Erreur lors de la planification:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  

// ✅ CORRIGÉ: Fonction pour annuler une planification
const cancelPlanification = async (req, res) => {    
  try {    
    const { id } = req.params;    
    
    if (!mongoose.Types.ObjectId.isValid(id)) {    
      return res.status(400).json({    
        success: false,    
        message: 'ID de commande invalide'    
      });    
    }    
    
    const planification = await Planification.findOne({ commande_id: id });    
        
    if (!planification) {    
      return res.status(404).json({    
        success: false,    
        message: 'Aucune planification trouvée pour cette commande'    
      });    
    }    
    
    const livraison = await Livraison.findOne({     
      planification_id: planification._id,    
      etat: 'EN_COURS'    
    });    
    
    if (livraison) {    
      return res.status(400).json({    
        success: false,    
        message: 'Impossible d\'annuler une planification avec une livraison en cours'    
      });    
    }    
    
    // Marquer comme annulée au lieu de supprimer
    planification.etat = 'ANNULE';
    await planification.save();
    // La synchronisation avec la commande se fait automatiquement via le middleware
    
    res.status(200).json({    
      success: true,    
      message: 'Planification annulée avec succès'    
    });    
    
  } catch (error) {    
    console.error('Erreur lors de l\'annulation de la planification:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// Supprimer une commande (reste identique)
const deleteCommandById = async (req, res) => {    
  try {    
    const { id } = req.params;    
    
    if (!mongoose.Types.ObjectId.isValid(id)) {    
      return res.status(400).json({    
        success: false,    
        message: 'ID de commande invalide'    
      });    
    }    
    
    const commande = await Command.findById(id);    
    if (!commande) {    
      return res.status(404).json({    
        success: false,    
        message: 'Commande non trouvée'    
      });    
    }    
    
    await CommandeLine.deleteMany({ commande_id: id });    
    
    const planifications = await Planification.find({ commande_id: id });  
    for (const planif of planifications) {  
      await Livraison.deleteMany({ planification_id: planif._id });  
      await LivraisonLine.deleteMany({   
        livraison_id: { $in: await Livraison.find({ planification_id: planif._id }).distinct('_id') }  
      });  
    }
    
    await Planification.deleteMany({ commande_id: id });
    await Command.findByIdAndDelete(id);    
    
    res.status(200).json({    
      success: true,    
      message: 'Commande supprimée avec succès'    
    });    
    
  } catch (error) {    
    console.error('Erreur lors de la suppression de la commande:', error);    
    res.status(500).json({    
      success: false,    
      message: error.message    
    });    
  }    
};    

// ✅ CORRIGÉ: Statistiques basées sur les statuts de commande
const getCommandsStats = async (req, res) => {    
  try {    
    // ✅ NOUVEAU: Statistiques basées sur les statuts de commande
    const commandeStats = await Command.aggregate([
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 }
        }
      }  
    ]);  
      
    const totalCommandes = await Command.countDocuments();  
    const commandesUrgentes = await Command.countDocuments({ urgent: true });  
      
    // ✅ NOUVEAU: Statistiques par priorité (garde la logique planification)  
    const priorityStats = await Planification.aggregate([  
      {  
        $group: {  
          _id: '$priority',  
          count: { $sum: 1 }  
        }  
      }  
    ]);  
      
    // Statistiques par mois (derniers 6 mois)  
    const sixMonthsAgo = new Date();  
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);  
      
    const monthlyStats = await Command.aggregate([  
      {  
        $match: {  
          date_commande: { $gte: sixMonthsAgo }  
        }  
      },  
      {  
        $group: {  
          _id: {  
            year: { $year: '$date_commande' },  
            month: { $month: '$date_commande' }  
          },  
          count: { $sum: 1 },  
          totalAmount: { $sum: '$montant_total' }  
        }  
      },  
      {  
        $sort: { '_id.year': 1, '_id.month': 1 }  
      }  
    ]);  
      
    // ✅ NOUVEAU: Transformer les statistiques basées sur les statuts de commande  
    const transformedStats = {  
      totalCommandes,  
      commandesUrgentes,  
      pending: 0,  
      assigned: 0,  
      inProgress: 0,  
      delivered: 0,  
      cancelled: 0  
    };  
      
    // ✅ NOUVEAU: Mapper les statuts de commande vers les statuts frontend  
    commandeStats.forEach(stat => {  
      switch(stat._id) {  
        case 'CONFIRMEE':  
          transformedStats.pending = stat.count;  
          break;  
        case 'ASSIGNEE':  
          transformedStats.assigned = stat.count;  
          break;  
        case 'EN_COURS':  
          transformedStats.inProgress = stat.count;  
          break;  
        case 'LIVREE':  
          transformedStats.delivered = stat.count;  
          break;  
        case 'ANNULEE':  
        case 'ECHOUEE':  
          transformedStats.cancelled += stat.count;  
          break;  
      }  
    });  
      
    res.status(200).json({  
      success: true,  
      data: {  
        ...transformedStats,  
        repartitionParPriorite: priorityStats,  
        statistiquesMensuelles: monthlyStats  
      }  
    });  
      
  } catch (error) {  
    console.error('Erreur lors de la récupération des statistiques:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  
  
// ✅ CORRIGÉ: Statistiques par client basées sur les statuts de commande  
const getCommandsStatsByCustomer = async (req, res) => {  
  try {  
    const { customerId } = req.params;  
      
    if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {  
      return res.status(400).json({  
        success: false,  
        message: 'ID client invalide'  
      });  
    }  
      
    // ✅ NOUVEAU: Statistiques basées sur les statuts de commande pour ce client  
    const commandeStatsByCustomer = await Command.aggregate([  
      {  
        $match: { customer_id: new mongoose.Types.ObjectId(customerId) }  
      },  
      {  
        $group: {  
          _id: '$statut',  
          count: { $sum: 1 }  
        }  
      }  
    ]);  
      
    const totalCommandes = await Command.countDocuments({ customer_id: customerId });  
    const commandesUrgentes = await Command.countDocuments({  
      customer_id: customerId,  
      urgent: true  
    });  
      
    // Montant total des commandes  
    const montantTotal = await Command.aggregate([  
      {  
        $match: { customer_id: new mongoose.Types.ObjectId(customerId) }  
      },  
      {  
        $group: {  
          _id: null,  
          total: { $sum: '$montant_total' }  
        }  
      }  
    ]);  
      
    // ✅ NOUVEAU: Transformer les statistiques pour le frontend  
    const transformedStatsByCustomer = {  
      totalCommandes,  
      commandesUrgentes,  
      montantTotal: montantTotal[0]?.total || 0,  
      pending: 0,  
      assigned: 0,  
      inProgress: 0,  
      delivered: 0,  
      cancelled: 0  
    };  
      
    // ✅ NOUVEAU: Mapper les statuts de commande  
    commandeStatsByCustomer.forEach(stat => {  
      switch(stat._id) {  
        case 'CONFIRMEE':  
          transformedStatsByCustomer.pending = stat.count;  
          break;  
        case 'ASSIGNEE':  
          transformedStatsByCustomer.assigned = stat.count;  
          break;  
        case 'EN_COURS':  
          transformedStatsByCustomer.inProgress = stat.count;  
          break;  
        case 'LIVREE':  
          transformedStatsByCustomer.delivered = stat.count;  
          break;  
        case 'ANNULEE':  
        case 'ECHOUEE':  
          transformedStatsByCustomer.cancelled += stat.count;  
          break;  
      }  
    });  
      
    res.status(200).json({  
      success: true,  
      data: {  
        ...transformedStatsByCustomer,  
        repartitionParStatut: commandeStatsByCustomer  
      }  
    });  
      
  } catch (error) {  
    console.error('Erreur lors de la récupération des statistiques client:', error);  
    res.status(500).json({  
      success: false,  
      message: error.message  
    });  
  }  
};  
  
module.exports = {  
  getCommands,  
  getCommandById,  
  getCommandsByCustomerId,  
  createCommand,  
  updateCommandById,  
  updateCommandStatus,  
  cancelPlanification,  
  cancelOrder,  
  deleteCommandById,  
  getCommandsStats,  
  getCommandsStatsByCustomer  
};