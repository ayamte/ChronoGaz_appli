import { useState, useEffect, useCallback, useRef, useMemo } from 'react';  
import { deliveryService } from '../services/api';  
import { useWebSocket } from './useWebSocket';  
  
const GRAPHHOPPER_API_KEY = '6fe731b8-5611-4fb5-afa2-da5059ae2564';  
  
export const useDeliveryTracking = (deliveryId, options = {}) => {  
  const {  
    enabled = true,  
    interval = 10000,  
    onPositionUpdate,  
    onStatusChange,  
    realTimeUpdates = true  
  } = options;  
  
  const [deliveryData, setDeliveryData] = useState(null);  
  const [driverPosition, setDriverPosition] = useState(null);  
  const [destinationPosition, setDestinationPosition] = useState(null);  
  const [routeInfo, setRouteInfo] = useState(null);  
  const [loading, setLoading] = useState(true);  
  const [error, setError] = useState(null);  
  
  const intervalRef = useRef(null);  
  const lastDriverPositionRef = useRef(null);  
  const lastRouteCalculationRef = useRef(null);  
  const routeCalculationTimeoutRef = useRef(null);  
    
  const { subscribe, identify, isConnected } = useWebSocket(realTimeUpdates);  
  
  // Mémorisation des callbacks pour éviter les re-renders inutiles  
  const memoizedOnPositionUpdate = useCallback(onPositionUpdate || (() => {}), [onPositionUpdate]);  
  const memoizedOnStatusChange = useCallback(onStatusChange || (() => {}), [onStatusChange]);  
  
  // Vérifie si le livreur a bougé suffisamment pour recalculer la route  
  const hasMovedSignificantly = useCallback((pos1, pos2) => {  
    if (!pos1 || !pos2) return true;  
    const deltaLat = Math.abs(pos1.lat - pos2.lat);  
    const deltaLng = Math.abs(pos1.lng - pos2.lng);  
    return deltaLat > 0.0005 || deltaLng > 0.0005; // Seuil plus élevé  
  }, []);  
  
  // Vérifie si les positions ont réellement changé  
  const positionsHaveChanged = useCallback((oldDriver, oldDest, newDriver, newDest) => {  
    if (!oldDriver || !oldDest || !newDriver || !newDest) return true;  
      
    return (  
      Math.abs(oldDriver.lat - newDriver.lat) > 0.00001 ||  
      Math.abs(oldDriver.lng - newDriver.lng) > 0.00001 ||  
      Math.abs(oldDest.lat - newDest.lat) > 0.00001 ||  
      Math.abs(oldDest.lng - newDest.lng) > 0.00001  
    );  
  }, []);  
  
  const calculateRouteInfo = useCallback(async (start, end) => {  
    // Vérifications de sécurité  
    if (!start || !end || typeof start.lat === 'undefined' || typeof end.lat === 'undefined') {  
      console.warn('Données de position manquantes pour le calcul de l\'itinéraire.');  
      return;  
    }  
  
    // Vérifier si on a déjà calculé pour ces positions récemment  
    const currentPositions = `${start.lat},${start.lng}-${end.lat},${end.lng}`;  
    const now = Date.now();  
      
    if (lastRouteCalculationRef.current &&   
        lastRouteCalculationRef.current.positions === currentPositions &&  
        (now - lastRouteCalculationRef.current.timestamp) < 30000) { // 30 secondes minimum  
      console.log('🚫 Route déjà calculée récemment, on skip');  
      return;  
    }  
  
    // Annuler toute requête en attente  
    if (routeCalculationTimeoutRef.current) {  
      clearTimeout(routeCalculationTimeoutRef.current);  
    }  
  
    // Debounce de 2 secondes  
    routeCalculationTimeoutRef.current = setTimeout(async () => {  
      try {  
        console.log('🔄 Calcul de la route...');  
        const url = `https://graphhopper.com/api/1/route?point=${start.lat},${start.lng}&point=${end.lat},${end.lng}&vehicle=car&locale=fr&calc_points=true&key=${GRAPHHOPPER_API_KEY}`;  
          
        const response = await fetch(url);  
          
        if (!response.ok) {  
          if (response.status === 429) {  
            console.warn('⚠️ Limite GraphHopper atteinte, on garde l\'ancienne route');  
            return;  
          }  
          throw new Error(`HTTP ${response.status}`);  
        }  
  
        const data = await response.json();  
  
        if (data.paths && data.paths.length > 0) {  
          const route = data.paths[0];  
          setRouteInfo({  
            distance: (route.distance / 1000).toFixed(1),  
            duration: Math.round(route.time / 60000),  
            geometry: route.points  
          });  
  
          // Marquer cette position comme calculée  
          lastRouteCalculationRef.current = {  
            positions: currentPositions,  
            timestamp: now  
          };  
  
          console.log('✅ Route calculée avec succès');  
        }  
      } catch (err) {  
        console.error('❌ Erreur calcul route:', err);  
      }  
    }, 2000);  
  }, []);  
  
  const fetchDeliveryData = useCallback(async () => {  
    if (!deliveryId || !enabled) return;  
  
    try {  
      setError(null);  
      const response = await deliveryService.getDeliveryTracking(deliveryId);  
  
      if (response.data.success) {  
        const data = response.data.data;  
          
        // Comparer avec les données précédentes pour éviter les mises à jour inutiles  
        const newDriverPos = data.derniere_position ? {  
          lat: parseFloat(data.derniere_position.latitude),  
          lng: parseFloat(data.derniere_position.longitude),  
          timestamp: data.derniere_position.timestamp  
        } : null;  
  
        const newDestPos = data.destination ? {  
          lat: parseFloat(data.destination.latitude),  
          lng: parseFloat(data.destination.longitude)  
        } : null;  
  
        // Ne mettre à jour que si les données ont changé  
        setDeliveryData(prevData => {  
          if (JSON.stringify(prevData) === JSON.stringify(data)) {  
            return prevData; // Pas de changement  
          }  
          return data;  
        });  
  
        // Mettre à jour les positions seulement si elles ont changé  
        if (newDriverPos && hasMovedSignificantly(lastDriverPositionRef.current, newDriverPos)) {  
          setDriverPosition(newDriverPos);  
          lastDriverPositionRef.current = newDriverPos;  
          memoizedOnPositionUpdate(newDriverPos);  
        }  
  
        if (newDestPos) {  
          setDestinationPosition(prevDest => {  
            if (prevDest &&   
                Math.abs(prevDest.lat - newDestPos.lat) < 0.00001 &&  
                Math.abs(prevDest.lng - newDestPos.lng) < 0.00001) {  
              return prevDest; // Pas de changement  
            }  
            return newDestPos;  
          });  
        }  
  
        // Statut changé ?  
        if (data.statut_livraison) {  
          memoizedOnStatusChange(data.statut_livraison);  
        }  
      }  
    } catch (err) {  
      console.error('Erreur tracking:', err);  
      setError('Erreur lors de la récupération des données de tracking');  
    } finally {  
      setLoading(false);  
    }  
  }, [deliveryId, enabled, memoizedOnPositionUpdate, memoizedOnStatusChange, hasMovedSignificantly]);  
  
  // Chargement initial  
  useEffect(() => {  
    if (deliveryId && enabled) {  
      fetchDeliveryData();  
    }  
  }, [deliveryId, enabled, fetchDeliveryData]);  
  
  // Calcul de route avec debounce et vérification des changements  
  useEffect(() => {  
    if (!driverPosition || !destinationPosition) {  
      return;  
    }  
  
    // Vérifier si les positions ont réellement changé  
    const shouldRecalculate = !lastRouteCalculationRef.current ||   
      positionsHaveChanged(  
        lastRouteCalculationRef.current.driverPos,  
        lastRouteCalculationRef.current.destPos,  
        driverPosition,  
        destinationPosition  
      );  
  
    if (shouldRecalculate) {  
      console.log('📍 Positions changées, recalcul de la route');  
      calculateRouteInfo(driverPosition, destinationPosition);  
    }  
  }, [driverPosition, destinationPosition, calculateRouteInfo, positionsHaveChanged]);  
  
  // Polling (seulement si WebSocket inactif)  
  useEffect(() => {  
    if (!enabled || !deliveryId || interval <= 0 || realTimeUpdates) return;  
  
    intervalRef.current = setInterval(fetchDeliveryData, interval);  
  
    return () => {  
      if (intervalRef.current) {  
        clearInterval(intervalRef.current);  
      }  
    };  
  }, [fetchDeliveryData, enabled, deliveryId, interval, realTimeUpdates]);  
  
  // WebSocket listeners  
  useEffect(() => {  
    if (!realTimeUpdates || !deliveryId || !isConnected) return;  
  
    identify(null, deliveryId, 'customer');  
  
    const unsubscribePosition = subscribe('position_updated', (data) => {  
      if (data.deliveryId === deliveryId) {  
        const newPosition = {  
          lat: parseFloat(data.position.latitude),  
          lng: parseFloat(data.position.longitude),  
          timestamp: data.timestamp  
        };  
  
        if (hasMovedSignificantly(lastDriverPositionRef.current, newPosition)) {  
          console.log('📡 Nouvelle position WebSocket:', newPosition);  
          lastDriverPositionRef.current = newPosition;  
          setDriverPosition(newPosition);  
          memoizedOnPositionUpdate(newPosition);  
        }  
      }  
    });  
  
    const unsubscribeStatus = subscribe('status_updated', (data) => {  
      if (data.deliveryId === deliveryId) {  
        setDeliveryData(prev => ({  
          ...prev,  
          statut_livraison: data.status  
        }));  
        memoizedOnStatusChange(data.status);  
      }  
    });  
  
    return () => {  
      unsubscribePosition();  
      unsubscribeStatus();  
    };  
  }, [  
    realTimeUpdates,  
    deliveryId,  
    isConnected,  
    subscribe,  
    identify,  
    memoizedOnPositionUpdate,  
    memoizedOnStatusChange,  
    hasMovedSignificantly  
  ]);  
  
  // Nettoyage  
  useEffect(() => {  
    return () => {  
      if (routeCalculationTimeoutRef.current) {  
        clearTimeout(routeCalculationTimeoutRef.current);  
      }  
    };  
  }, []);  
  
  const refetch = useCallback(() => {  
    setLoading(true);  
    fetchDeliveryData();  
  }, [fetchDeliveryData]);  
  
  // Mémoriser les valeurs de retour pour éviter les re-renders  
  const returnValue = useMemo(() => ({  
    deliveryData,  
    driverPosition,  
    destinationPosition,  
    routeInfo,  
    loading,  
    error,  
    refetch,  
    isConnected  
  }), [deliveryData, driverPosition, destinationPosition, routeInfo, loading, error, refetch, isConnected]);  
  
  return returnValue;  
};