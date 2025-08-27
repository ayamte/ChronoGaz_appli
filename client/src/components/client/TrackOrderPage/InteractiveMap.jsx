// chronogaz_front/src/components/client/trackorderpage/InteractiveMap.jsx
import React, { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useDeliveryTracking } from "../../../hooks/useDeliveryTracking";
import { createCustomIcon, getMapStyles, fitMapBounds } from "../../../utils/mapUtils";

//const GRAPHHOPPER_API_KEY = '6fe731b8-5611-4fb5-afa2-da5059ae2564';

const InteractiveMap = ({
  deliveryId,
  isVisible = true,
  autoCenter = true,
  showRoute = true,
  updateInterval = 10000,
  onPositionUpdate,
  onStatusChange
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);
  // ✅ SUPPRIMÉ: lastRouteUpdateRef pour permettre les mises à jour

  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState(null);
  const [graphHopperError, setGraphHopperError] = useState(null);

  // Mémorisation des callbacks pour éviter les re-renders
  const memoizedOnPositionUpdate = useCallback((position) => {
    console.log('Position mise à jour:', position);
    if (onPositionUpdate) onPositionUpdate(position);
  }, [onPositionUpdate]);

  const memoizedOnStatusChange = useCallback((status) => {
    console.log('Statut changé:', status);
    if (onStatusChange) onStatusChange(status);
  }, [onStatusChange]);

  // Hook de tracking avec callbacks mémorisés
  const {
    deliveryData,
    driverPosition,
    destinationPosition,
    routeInfo,
    loading,
    error: trackingError,
    isConnected,
    refetch
  } = useDeliveryTracking(deliveryId, {
    enabled: isVisible && !!deliveryId,
    interval: updateInterval,
    onPositionUpdate: memoizedOnPositionUpdate,
    onStatusChange: memoizedOnStatusChange,
    realTimeUpdates: true
  });

  // Gestion des erreurs
  useEffect(() => {
    if (trackingError) {
      console.error('❌ Erreur de tracking:', trackingError);
      setError('Erreur lors de la récupération des données de tracking');
    } else {
      setError(null);
    }
  }, [trackingError]);

  // Chargement de Leaflet (une seule fois)
  useEffect(() => {
    const loadLeaflet = async () => {
      if (window.L) {
        setLeafletLoaded(true);
        return;
      }

      try {
        console.log('🗺️ Chargement de Leaflet...');
        
        if (!document.querySelector('link[href*="leaflet"]')) {
          const leafletCSS = document.createElement('link');
          leafletCSS.rel = 'stylesheet';
          leafletCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.min.css';
          document.head.appendChild(leafletCSS);
        }

        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        if (getMapStyles) {
          const styleElement = document.createElement('style');
          styleElement.textContent = getMapStyles();
          document.head.appendChild(styleElement);
        }

        console.log('✅ Leaflet chargé avec succès');
        setLeafletLoaded(true);
      } catch (err) {
        console.error('❌ Erreur chargement Leaflet:', err);
        setError('Erreur lors du chargement de la bibliothèque de carte');
      }
    };
    
    loadLeaflet();

    // Nettoyage
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.error('Erreur suppression carte:', e);
        }
        mapInstanceRef.current = null;
        setMapReady(false);
      }
    };
  }, []);

  // Initialisation de la carte (une seule fois)
  useEffect(() => {
    if (mapReady || !leafletLoaded || !driverPosition || !destinationPosition) {
      return;
    }

    try {
      console.log('🗺️ Initialisation de la carte...');
      mapInstanceRef.current = window.L.map(mapRef.current, {
        center: [driverPosition.lat, driverPosition.lng],
        zoom: 13,
        zoomControl: true
      });

      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstanceRef.current);

      setMapReady(true);
      console.log('✅ Carte initialisée avec succès');
    } catch (err) {
      console.error('❌ Erreur initialisation carte:', err);
      setError('Erreur lors de l\'initialisation de la carte: ' + err.message);
    }
  }, [leafletLoaded, mapReady, driverPosition, destinationPosition]);

  // Fonction de décodage polyline
  const decodePolyline = useCallback((encoded) => {
    if (!encoded) return [];
    
    let index = 0;
    let lat = 0;
    let lng = 0;
    const coordinates = [];

    const len = encoded.length;
    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      coordinates.push([lat / 1e5, lng / 1e5]);
    }
    return coordinates;
  }, []);

  // Création/mise à jour des marqueurs (optimisé)
  useEffect(() => {
    if (!mapReady || !leafletLoaded || !driverPosition || !destinationPosition) return;

    const createOrUpdateMarkers = () => {
      try {
        // Marqueur du livreur
        if (!driverMarkerRef.current) {
          const driverIcon = createCustomIcon('driver', '#4DAEBD');
          driverMarkerRef.current = window.L.marker([driverPosition.lat, driverPosition.lng], { icon: driverIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<h4>Livreur</h4><p>Position en temps réel</p>`);
        } else {
          driverMarkerRef.current.setLatLng([driverPosition.lat, driverPosition.lng]);
        }

        // Marqueur de destination
        if (!destinationMarkerRef.current) {
          const destinationIcon = createCustomIcon('destination', '#1F55A3');
          destinationMarkerRef.current = window.L.marker([destinationPosition.lat, destinationPosition.lng], { icon: destinationIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup(`<h4>Destination</h4><p>${deliveryData?.destination?.rue || 'Adresse'}</p>`);
        } else {
          destinationMarkerRef.current.setLatLng([destinationPosition.lat, destinationPosition.lng]);
        }

        // Centrage automatique
        if (autoCenter && fitMapBounds) {
          fitMapBounds(mapInstanceRef.current, [driverPosition, destinationPosition]);
        }
      } catch (err) {
        console.error('❌ Erreur création marqueurs:', err);
      }
    };

    createOrUpdateMarkers();
  }, [mapReady, leafletLoaded, driverPosition, destinationPosition, autoCenter, deliveryData]);

  // ✅ CORRECTION: Mise à jour de la route simplifiée - TOUJOURS redessiner quand routeInfo change
  useEffect(() => {
    if (!showRoute || !mapReady || !routeInfo?.geometry) {
      // Supprimer la route existante si pas de géométrie
      if (routePolylineRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
        routePolylineRef.current = null;
      }
      setGraphHopperError(null);
      return;
    }

    try {
      console.log('🗺️ Mise à jour de la route sur la carte...', routeInfo);
      
      const coords = decodePolyline(routeInfo.geometry);
      
      if (routePolylineRef.current) {
        mapInstanceRef.current.removeLayer(routePolylineRef.current);
      }
      
      routePolylineRef.current = window.L.polyline(coords, { 
        color: '#4DAEBD', 
        weight: 4, 
        opacity: 0.8 
      }).addTo(mapInstanceRef.current);

      setGraphHopperError(null);
      console.log('✅ Route mise à jour avec succès');

    } catch (err) {
      console.error('❌ Erreur affichage route:', err);
      setGraphHopperError("Erreur lors de l'affichage de l'itinéraire.");
    }
  }, [mapReady, showRoute, routeInfo, decodePolyline]); // ✅ Supprimé driverPosition et destinationPosition des dépendances

  // Fonctions de contrôle de la carte
  const centerOnDriver = useCallback(() => {
    if (mapInstanceRef.current && driverPosition) {
      mapInstanceRef.current.setView([driverPosition.lat, driverPosition.lng], 15, { animate: true, duration: 1 });
    }
  }, [driverPosition]);

  const centerOnDestination = useCallback(() => {
    if (mapInstanceRef.current && destinationPosition) {
      mapInstanceRef.current.setView([destinationPosition.lat, destinationPosition.lng], 15, { animate: true, duration: 1 });
    }
  }, [destinationPosition]);

  const fitAllMarkers = useCallback(() => {
    if (mapInstanceRef.current && driverPosition && destinationPosition && fitMapBounds) {
      fitMapBounds(mapInstanceRef.current, [driverPosition, destinationPosition]);
    }
  }, [driverPosition, destinationPosition]);

  // Mémorisation des infos de debug pour éviter les re-renders
  const debugInfo = useMemo(() => ({
    deliveryData: !!deliveryData,
    driverPosition: !!driverPosition,
    destinationPosition: !!destinationPosition,
    leafletLoaded,
    isConnected
  }), [deliveryData, driverPosition, destinationPosition, leafletLoaded, isConnected]);

  if (!isVisible) return null;

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Erreur de chargement</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          
          <div className="bg-gray-100 p-4 rounded mb-4 text-left text-sm">
            <p><strong>Debug Info:</strong></p>
            <p>DeliveryData: {debugInfo.deliveryData ? '✅' : '❌'}</p>
            <p>DriverPosition: {debugInfo.driverPosition ? '✅' : '❌'}</p>
            <p>DestinationPosition: {debugInfo.destinationPosition ? '✅' : '❌'}</p>
            <p>Leaflet: {debugInfo.leafletLoaded ? '✅' : '❌'}</p>
            <p>Connected: {debugInfo.isConnected ? '✅' : '❌'}</p>
          </div>
          
          <button 
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading || !deliveryData || !driverPosition || !destinationPosition) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chargement de la carte</h3>
          <p className="text-gray-600">Récupération des données en cours...</p>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>Leaflet: {debugInfo.leafletLoaded ? '✅' : '⏳'}</p>
            <p>Données: {debugInfo.deliveryData ? '✅' : '⏳'}</p>
            <p>Position livreur: {debugInfo.driverPosition ? '✅' : '⏳'}</p>
            <p>Position destination: {debugInfo.destinationPosition ? '✅' : '⏳'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden relative">
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-blue-800">
              Suivi en Temps Réel
            </h3>
            <p className="text-sm text-gray-600">
              Livraison #{deliveryId || deliveryData?.planification_id}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {isConnected ? 'Temps réel' : 'Mode polling'}
              </span>
            </div>
            
            {/*<button
              onClick={refetch}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Actualiser"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.001 0 01-15.357-2m15.357 2H15" />
              </svg>
  </button>*/}
          </div>
        </div>
      </div>

      <div className="relative">
        <div 
          ref={mapRef}
          className="w-full h-96 z-10"
          style={{ minHeight: '400px' }}
        />
        
        {graphHopperError && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 p-2 bg-red-500 text-white text-sm rounded-lg shadow-lg z-10">
            {graphHopperError}
          </div>
        )}

        {!mapReady && (
          <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">Initialisation de la carte...</p>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          {routeInfo && (
            <>
              <div className="text-center">
                <p className="text-sm text-gray-600">Distance</p>
                <p className="text-lg font-bold text-blue-800">
                  {routeInfo.distance < 1 
                  ? `${(Number(routeInfo.distance) * 1000).toFixed(0)} m`
                  : `${Number(routeInfo.distance).toFixed(1)} km`
                  }   
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Temps estimé</p>
                <p className="text-lg font-bold text-blue-800">
                {routeInfo.duration > 60 
                  ? `${(Number(routeInfo.duration) / 60).toFixed(0)} heurs ${(Number(routeInfo.duration) % 60).toFixed(0)} min`
                  : `${Number(routeInfo.duration).toFixed(0)} min`
                  } 
                </p>
              </div>
            </>
          )}
          
          <div className="text-center">
            <p className="text-sm text-gray-600">Statut</p>
            <p className={`text-lg font-bold ${
              deliveryData?.statut_livraison === 'LIVREE' ? 'text-green-600' :
              deliveryData?.statut_livraison === 'EN_COURS' ? 'text-blue-600' :
              deliveryData?.statut_livraison === 'ECHEC' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              {deliveryData?.statut_livraison || 'En cours'}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">Dernière MAJ</p>
            <p className="text-sm font-medium text-gray-800">
              {driverPosition?.timestamp ? 
                new Date(driverPosition.timestamp).toLocaleTimeString() : 
                new Date().toLocaleTimeString()
              }
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-400"></div>
              <span className="text-sm text-gray-600">Livreur</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-800"></div>
              <span className="text-sm text-gray-600">Destination</span>
            </div>
            {showRoute && routeInfo && (
              <div className="flex items-center space-x-2">
                <div className="w-3 h-1 bg-blue-400"></div>
                <span className="text-sm text-gray-600">Itinéraire</span>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={centerOnDriver}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!mapReady || !driverPosition}
            >
              Livreur
            </button>
            <button 
              onClick={centerOnDestination}
              className="px-3 py-1 bg-blue-800 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!mapReady || !destinationPosition}
            >
              Destination
            </button>
            <button 
              onClick={fitAllMarkers}
              className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!mapReady}
            >
              Vue globale
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(InteractiveMap);