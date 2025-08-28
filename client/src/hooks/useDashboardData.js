// ✅ Hook pour récupérer les données réelles du dashboard
import { useState, useEffect } from 'react';
import axios from 'axios';

export const useDashboardData = (refreshInterval = 30000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchDashboardData = async () => {
    try {
      console.log('📊 [Dashboard] Récupération des données réelles...');
      
      const token = localStorage.getItem('token');
      // ✅ CORRIGÉ: Utiliser le bon endpoint avec les données réelles
      const response = await axios.get('/api/reports/dashboard/real', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setData(response.data.data);
        setLastUpdate(new Date());
        setError(null);
        console.log('✅ [Dashboard] Données récupérées:', response.data.data);
      } else {
        throw new Error(response.data.message || 'Erreur récupération données');
      }
    } catch (err) {
      console.error('❌ [Dashboard] Erreur récupération:', err);
      setError(err.response?.data?.message || err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Récupération initiale
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Actualisation automatique
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  // Fonction pour forcer l'actualisation
  const refresh = () => {
    setLoading(true);
    fetchDashboardData();
  };

  return {
    data,
    loading,
    error,
    lastUpdate,
    refresh
  };
};

// ✅ Hook pour formater les données pour les graphiques
export const useChartData = (rawData) => {
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    if (!rawData?.commandesParJour) return;

    // Transformer les données pour le graphique
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayData = rawData.commandesParJour.find(d => d._id === dateStr);
      
      last7Days.push({
        period: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        commandes: dayData?.count || 0,
        montant: dayData?.montantTotal || 0,
        fullDate: date.toLocaleDateString('fr-FR')
      });
    }

    setChartData(last7Days);
  }, [rawData]);

  return chartData;
};

// ✅ Hook pour les statistiques formatées
export const useFormattedStats = (rawData) => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!rawData) return;

    const formatted = {
      // Cartes principales
      totalCommandes: rawData.totaux?.commandes || 0,
      totalClients: rawData.totaux?.clients || 0,
      totalChauffeurs: rawData.totaux?.chauffeurs || 0,
      totalCamions: rawData.totaux?.camions || 0,

      // Répartition des statuts
      commandesConfirmees: rawData.statutsCommandes?.CONFIRMEE || 0,
      commandesAssignees: rawData.statutsCommandes?.ASSIGNEE || 0,
      commandesEnCours: rawData.statutsCommandes?.EN_COURS || 0,
      commandesLivrees: rawData.statutsCommandes?.LIVREE || 0,
      commandesAnnulees: rawData.statutsCommandes?.ANNULEE || 0,

      // Calculs dérivés
      tauxLivraison: rawData.totaux?.commandes > 0 
        ? ((rawData.statutsCommandes?.LIVREE || 0) / rawData.totaux.commandes * 100).toFixed(1)
        : 0,
      
      commandesActives: (rawData.statutsCommandes?.EN_COURS || 0) + 
                       (rawData.statutsCommandes?.ASSIGNEE || 0),

      // Données pour les graphiques circulaires
      statutsData: [
        { name: 'Livrées', value: rawData.statutsCommandes?.LIVREE || 0, color: '#10b981' },
        { name: 'En cours', value: rawData.statutsCommandes?.EN_COURS || 0, color: '#3b82f6' },
        { name: 'Assignées', value: rawData.statutsCommandes?.ASSIGNEE || 0, color: '#f59e0b' },
        { name: 'Confirmées', value: rawData.statutsCommandes?.CONFIRMEE || 0, color: '#6b7280' },
        { name: 'Annulées', value: rawData.statutsCommandes?.ANNULEE || 0, color: '#ef4444' }
      ].filter(item => item.value > 0)
    };

    setStats(formatted);
  }, [rawData]);

  return stats;
};

export default useDashboardData;
