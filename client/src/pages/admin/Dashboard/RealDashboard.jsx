// ✅ Dashboard simple avec données réelles - Ventes par période
import React, { useState } from 'react';
import { useDashboardData, useFormattedStats } from "../../../hooks/useDashboardData";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import "./Dashboard.css";

export default function RealDashboard() {
  const { data: dashboardData, loading, error, lastUpdate, refresh } = useDashboardData(30000);
  const stats = useFormattedStats(dashboardData);
  const [selectedPeriod, setSelectedPeriod] = useState('semaine');

  // Gestion du chargement
  if (loading && !dashboardData) {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-wrapper">
          <div className="dashboard-container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '400px',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ fontSize: '48px' }}>📊</div>
              <div style={{ fontSize: '18px', color: '#666' }}>Chargement des données réelles...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gestion des erreurs
  if (error) {
    return (
      <div className="dashboard-layout">
        <div className="dashboard-wrapper">
          <div className="dashboard-container">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '400px',
              flexDirection: 'column',
              gap: '20px'
            }}>
              <div style={{ fontSize: '48px' }}>❌</div>
              <div style={{ fontSize: '18px', color: '#ef4444' }}>Erreur: {error}</div>
              <button 
                onClick={refresh}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                🔄 Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Préparer les données pour le graphique selon la période
  const getChartData = () => {
    if (!dashboardData?.commandesParJour) return [];

    const data = dashboardData.commandesParJour;

    if (selectedPeriod === 'semaine') {
      // 7 derniers jours
      const last7Days = [];
      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayData = data.find(d => d._id === dateStr);

        last7Days.push({
          period: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
          commandes: dayData?.count || 0,
          montant: dayData?.montantTotal || 0
        });
      }

      return last7Days;
    } else {
      // 12 derniers mois
      const last12Months = [];
      const today = new Date();

      for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = date.toISOString().substring(0, 7); // YYYY-MM

        const monthData = data.filter(d => d._id.startsWith(monthStr));
        const monthTotal = monthData.reduce((sum, item) => sum + item.count, 0);
        const monthMontant = monthData.reduce((sum, item) => sum + item.montantTotal, 0);

        last12Months.push({
          period: date.toLocaleDateString('fr-FR', { month: 'short' }),
          commandes: monthTotal,
          montant: monthMontant
        });
      }

      return last12Months;
    }
  };

  const chartData = getChartData();

  return (
    <div className="dashboard-layout">
      <div className="dashboard-wrapper">
        <div className="dashboard-container">
          <div className="dashboard-content">

            {/* Header simple */}
            <div className="dashboard-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 className="dashboard-title">Dashboard ChronoGaz</h1>
                  <p style={{ color: '#666', margin: '5px 0' }}>
                    Données réelles de votre activité
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {lastUpdate && (
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      Mis à jour: {lastUpdate.toLocaleTimeString()}
                    </span>
                  )}
                  <button
                    onClick={refresh}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Actualiser
                  </button>
                </div>
              </div>
            </div>

            {/* Statistiques principales */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              marginBottom: '2rem'
            }}>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📦</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151' }}>
                  {stats?.totalCommandes || 0}
                </div>
                <div style={{ color: '#6b7280' }}>Total Commandes</div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👥</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#374151' }}>
                  {stats?.totalClients || 0}
                </div>
                <div style={{ color: '#6b7280' }}>Clients</div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚚</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>
                  {stats?.commandesEnCours || 0}
                </div>
                <div style={{ color: '#6b7280' }}>En Cours</div>
              </div>

              <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                  {stats?.commandesLivrees || 0}
                </div>
                <div style={{ color: '#6b7280' }}>Livrées</div>
              </div>

            </div>

            {/* Graphique des ventes */}
            <div style={{
              backgroundColor: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ color: '#374151' }}>Évolution des Ventes</h3>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setSelectedPeriod('semaine')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: selectedPeriod === 'semaine' ? '#3b82f6' : '#f3f4f6',
                      color: selectedPeriod === 'semaine' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Semaine
                  </button>
                  <button
                    onClick={() => setSelectedPeriod('mois')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: selectedPeriod === 'mois' ? '#3b82f6' : '#f3f4f6',
                      color: selectedPeriod === 'mois' ? 'white' : '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Mois
                  </button>
                </div>
              </div>

              {chartData && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'commandes' ? `${value} commandes` : `${value} DH`,
                        name === 'commandes' ? 'Commandes' : 'Montant'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="commandes" fill="#3b82f6" name="Commandes" />
                    <Bar dataKey="montant" fill="#10b981" name="Montant (DH)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  height: '400px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280'
                }}>
                  📊 Aucune donnée de vente disponible
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
