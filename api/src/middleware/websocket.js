// chronogazback/middleware/websocket.js
const { updateDriverPosition } = require('../utils/gpsTracker');

const connectedClients = new Map();
const deliverySubscriptions = new Map();

const setupWebSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔗 Client connecté: ${socket.id}`);
    
    // Stockage du client
    connectedClients.set(socket.id, {
      socket: socket,
      userId: null,
      deliveryId: null,
      connectedAt: new Date()
    });

    // Événement d'authentification/identification
    socket.on('identify', (data) => {
      const { userId, deliveryId, type } = data;
      const client = connectedClients.get(socket.id);
      
      if (client) {
        client.userId = userId;
        client.deliveryId = deliveryId;
        client.type = type; // 'customer' ou 'driver'

        // S'abonner aux mises à jour de cette livraison
        if (deliveryId) {
          if (!deliverySubscriptions.has(deliveryId)) {
            deliverySubscriptions.set(deliveryId, new Set());
          }
          deliverySubscriptions.get(deliveryId).add(socket.id);
          socket.join(`delivery_${deliveryId}`);
          console.log(`👤 Client ${socket.id} abonné à la livraison ${deliveryId}`);
        }
      }
    });

    // ✅ CORRECTION: Événement de mise à jour de position (du livreur)
    socket.on('position_update', async (data) => {
      try {
        const { deliveryId, latitude, longitude, timestamp } = data;
        
        console.log(`📡 [WebSocket] Position reçue pour livraison ${deliveryId}:`, { latitude, longitude });

        // ✅ 1. SAUVEGARDER EN BASE DE DONNÉES
        const result = await updateDriverPosition(deliveryId, latitude, longitude, io);
        
        if (result.success) {
          console.log(`💾 [WebSocket] Position sauvegardée en base`);
          
          // ✅ 2. DIFFUSER À TOUS LES CLIENTS CONNECTÉS À CETTE LIVRAISON
          const positionUpdate = {
            deliveryId,
            position: {
              latitude: parseFloat(latitude),
              longitude: parseFloat(longitude)
            },
            timestamp: timestamp || new Date().toISOString()
          };

          // Diffuser via les rooms WebSocket
          io.to(`delivery_${deliveryId}`).emit('position_updated', positionUpdate);
          
          console.log(`📤 [WebSocket] Position diffusée à tous les clients de la livraison ${deliveryId}`);
          
          // Log des clients connectés pour debug
          const subscribers = deliverySubscriptions.get(deliveryId);
          if (subscribers) {
            console.log(`👥 [WebSocket] ${subscribers.size} clients abonnés à la livraison ${deliveryId}`);
          }
        } else {
          console.error(`❌ [WebSocket] Échec sauvegarde position pour livraison ${deliveryId}`);
        }
      } catch (error) {
        console.error(`❌ [WebSocket] Erreur traitement position_update:`, error);
        
        // Envoyer une erreur au client qui a envoyé la position
        socket.emit('position_error', {
          message: 'Erreur lors de la mise à jour de position',
          error: error.message
        });
      }
    });

    // Événement de changement de statut de livraison
    socket.on('status_update', (data) => {
      const { deliveryId, status, message } = data;
      
      const statusUpdate = {
        deliveryId,
        status,
        message,
        timestamp: new Date().toISOString()
      };

      io.to(`delivery_${deliveryId}`).emit('status_updated', statusUpdate);
      console.log(`🔄 Statut mis à jour pour livraison ${deliveryId}: ${status}`);
    });

    // Déconnexion
    socket.on('disconnect', () => {
      const client = connectedClients.get(socket.id);
      if (client && client.deliveryId) {
        const subscribers = deliverySubscriptions.get(client.deliveryId);
        if (subscribers) {
          subscribers.delete(socket.id);
          if (subscribers.size === 0) {
            deliverySubscriptions.delete(client.deliveryId);
          }
        }
      }
      connectedClients.delete(socket.id);
      console.log(`❌ Client déconnecté: ${socket.id}`);
    });
  });

  // Fonction utilitaire pour diffuser des mises à jour depuis les contrôleurs
  const broadcastToDelivery = (deliveryId, event, data) => {
    io.to(`delivery_${deliveryId}`).emit(event, data);
  };

  // Exposer les fonctions utilitaires
  io.broadcastToDelivery = broadcastToDelivery;
  io.getConnectedClients = () => connectedClients;
  io.getDeliverySubscriptions = () => deliverySubscriptions;
};

module.exports = setupWebSocket;
