# Guide de débogage - Problème de carte de suivi

## Étapes de débogage recommandées

### 1. Vérifier les logs côté serveur

Quand le chauffeur clique sur "Démarrer route", vérifiez ces logs dans la console serveur :

```
🚀 [DEBUG] Démarrage livraison pour planification: [ID]
✅ [DEBUG] Livraison créée avec ID: [ID]
✅ [DEBUG] Lignes de livraison créées: [NOMBRE]
📤 [WebSocket] Notification de démarrage de livraison envoyée: [DATA]
```

**Si ces logs n'apparaissent pas** :
- Vérifiez que `req.io` est disponible dans le contrôleur
- Vérifiez que le middleware WebSocket est correctement configuré

### 2. Vérifier les logs côté client (Page de tracking)

Dans la console du navigateur côté client, vous devriez voir :

```
🚚 [TrackOrder] Livraison démarrée reçue: [DATA]
✅ [TrackOrder] Livraison démarrée pour cette commande - rechargement...
```

**Si ces logs n'apparaissent pas** :
- Vérifiez que le WebSocket est connecté : `🔌 [TrackOrder] État connexion WebSocket: true`
- Vérifiez que le client écoute les bons événements

### 3. Vérifier les logs côté chauffeur

Dans la console du navigateur côté chauffeur, vous devriez voir :

```
🚀 Démarrage livraison pour planification: [ID]
✅ Livraison créée avec ID: [ID]
✅ Ordre sélectionné mis à jour avec ID livraison: [ID]
🎯 Démarrage automatique du suivi GPS...
📤 Envoi de la position pour l'ID: [ID] (type: livraison)
```

### 4. Vérifier l'affichage de la carte côté client

La carte doit apparaître quand cette condition est vraie :
```javascript
orderData?.livraison && orderData.livraison.etat === 'EN_COURS'
```

**Vérifiez dans la console** :
```javascript
console.log('Livraison:', orderData?.livraison);
console.log('État livraison:', orderData?.livraison?.etat);
```

### 5. Vérifier le hook useDeliveryTracking

Dans la console, vérifiez ces logs :
```
🚚 [useDeliveryTracking] Livraison démarrée: [DATA]
✅ [useDeliveryTracking] Réabonnement avec ID livraison: [ID]
📡 Nouvelle position WebSocket: [POSITION]
```

## Commandes de débogage utiles

### Dans la console du navigateur (côté client) :

```javascript
// Vérifier l'état de la connexion WebSocket
console.log('WebSocket connecté:', window.websocketService?.isConnected);

// Vérifier les données de commande
console.log('Order data:', window.orderData || 'Non disponible');

// Forcer un rechargement des données
if (window.fetchOrderData) window.fetchOrderData();

// Tester manuellement l'événement delivery_started
if (window.websocketService) {
  window.websocketService.socket.emit('test_delivery_started', {
    orderId: 'VOTRE_ORDER_ID',
    deliveryId: 'VOTRE_DELIVERY_ID'
  });
}
```

### Dans la console du navigateur (côté chauffeur) :

```javascript
// Vérifier l'ordre sélectionné
console.log('Selected order:', window.selectedOrder || 'Non disponible');

// Vérifier l'état du suivi GPS
console.log('Tracking actif:', window.isTracking || 'Non disponible');

// Forcer l'envoi d'une position de test
if (window.websocketService && window.selectedOrder) {
  window.websocketService.updatePosition(
    window.selectedOrder.livraisonId || window.selectedOrder.planificationId,
    48.8566, // Latitude Paris
    2.3522   // Longitude Paris
  );
}
```

## Problèmes courants et solutions

### 1. La carte n'apparaît pas côté client
**Cause possible** : `orderData.livraison` est null ou `etat !== 'EN_COURS'`
**Solution** : Vérifier que la livraison est bien créée et que les données sont rechargées

### 2. Pas de positions GPS reçues
**Cause possible** : Mauvais ID utilisé pour le WebSocket
**Solution** : Vérifier que l'ID de livraison est utilisé, pas l'ID de planification

### 3. WebSocket non connecté
**Cause possible** : Problème de configuration serveur
**Solution** : Redémarrer le serveur et vérifier les logs de connexion

### 4. Événements WebSocket non reçus
**Cause possible** : Client non identifié correctement
**Solution** : Vérifier l'appel à `identify()` avec le bon ID

## Checklist de vérification

- [ ] Le serveur démarre sans erreurs
- [ ] Le WebSocket est configuré et accessible
- [ ] Le chauffeur peut se connecter et voir ses commandes
- [ ] Le client peut accéder à la page de tracking
- [ ] Les deux sont connectés au WebSocket
- [ ] Le clic sur "Démarrer route" crée une livraison
- [ ] L'événement `delivery_started` est émis
- [ ] Le client reçoit l'événement et recharge les données
- [ ] La carte apparaît avec les bonnes données
- [ ] Les positions GPS sont envoyées et reçues

## Logs à surveiller

### Serveur (Node.js)
- Création de livraison
- Émission d'événements WebSocket
- Réception de positions GPS
- Erreurs de base de données

### Client (Console navigateur)
- Connexion WebSocket
- Réception d'événements
- Rechargement de données
- Erreurs JavaScript

### Chauffeur (Console navigateur)
- Démarrage de livraison
- Activation du GPS
- Envoi de positions
- Mise à jour de l'interface
