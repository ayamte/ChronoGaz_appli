const express = require('express');    
const {   
  getPlanifications,   
  getPlanificationById,  
  createPlanification,  
  cancelPlanificationByCommande  // ✅ CORRIGÉ: Utiliser le bon nom  
} = require('../controllers/planificationController');    
const { authenticateToken } = require('../middleware/authMiddleware');    
    
const router = express.Router();    
    
// GET /api/planifications    
router.get('/', authenticateToken, getPlanifications);    
    
// GET /api/planifications/:id    
router.get('/:id', authenticateToken, getPlanificationById);  
  
// ✅ NOUVEAU: POST /api/planifications - Créer une planification (assigner un camion)  
router.post('/', authenticateToken, createPlanification);  
  
// ✅ CORRIGÉ: Utiliser le bon nom de fonction  
router.delete('/commande/:commandeId', authenticateToken, cancelPlanificationByCommande);  
    
module.exports = router;