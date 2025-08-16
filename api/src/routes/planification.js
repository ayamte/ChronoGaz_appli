const express = require('express');  
const { 
  getPlanifications, 
  getPlanificationById,
  createPlanification,
  deletePlanificationByCommande
} = require('../controllers/planificationController');  
const { authenticateToken } = require('../middleware/authMiddleware');  
  
const router = express.Router();  
  
// GET /api/planifications  
router.get('/', authenticateToken, getPlanifications);  
  
// GET /api/planifications/:id  
router.get('/:id', authenticateToken, getPlanificationById);

// ✅ NOUVEAU: POST /api/planifications - Créer une planification (assigner un camion)
router.post('/', authenticateToken, createPlanification);

// ✅ NOUVEAU: DELETE /api/planifications/commande/:commandeId - Supprimer une planification par commande
router.delete('/commande/:commandeId', authenticateToken, deletePlanificationByCommande);
  
module.exports = router;