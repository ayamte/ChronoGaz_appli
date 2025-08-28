import { useState } from "react"  
import {   
  MdChevronLeft as ChevronLeft,   
  MdChevronRight as ChevronRight,   
  MdCalendarToday as Calendar,   
  MdRefresh as RotateCcw   
} from "react-icons/md"  
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'  
import "./Dashboard.css"  
import butaneImage from './butane.png'
import propaneImage from './propane.png'
  
// Fonction pour générer des données aléatoires mais cohérentes basées sur une date  
const generateSalesData = (dateString, index = 0) => {  
  const seed = new Date(dateString).getTime() + index * 1000  
  const random = (min, max, seedOffset = 0) => {  
    const x = Math.sin(seed + seedOffset) * 10000  
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min  
  }  
  
  return {  
    butane: random(25, 85, 1),  
    propane: random(20, 75, 2),  
  }  
}  
  
// Fonctions utilitaires pour les dates  
const formatDate = (date, format) => {  
  const options = {  
    year: "numeric",  
    month: "long",  
    day: "numeric",  
    weekday: "long",  
  }  
  
  switch (format) {  
    case "week":  
      return `Semaine du ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`  
    case "month":  
      return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })  
    case "year":  
      return date.getFullYear().toString()  
    default:  
      return date.toLocaleDateString("fr-FR", options)  
  }  
}  
  
const getWeekStart = (date) => {  
  const d = new Date(date)  
  const day = d.getDay()  
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)  
  return new Date(d.setDate(diff))  
}  
  
const getMonthStart = (date) => {  
  return new Date(date.getFullYear(), date.getMonth(), 1)  
}  
  
const getYearStart = (date) => {  
  return new Date(date.getFullYear(), 0, 1)  
}  
  
const addPeriod = (date, type, amount) => {  
  const newDate = new Date(date)  
  switch (type) {  
    case "jour":  
      newDate.setDate(newDate.getDate() + amount * 7)  
      break  
    case "semaine":  
      newDate.setMonth(newDate.getMonth() + amount)  
      break  
    case "mois":  
      newDate.setFullYear(newDate.getFullYear() + amount)  
      break  
  }  
  return newDate  
}  
  
// Génération des données pour une période donnée  
const generateDataForPeriod = (periodType, currentDate) => {  
  let startDate  
  let labels  
  const data = []  
  
  switch (periodType) {  
    case "jour":  
      startDate = getWeekStart(currentDate)  
      labels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]  
  
      for (let i = 0; i < 7; i++) {  
        const dayDate = new Date(startDate)  
        dayDate.setDate(startDate.getDate() + i)  
        const salesData = generateSalesData(dayDate.toISOString(), i)  
        data.push({  
          period: labels[i],  
          butane: salesData.butane,  
          propane: salesData.propane,  
          fullDate: dayDate.toLocaleDateString("fr-FR"),  
        })  
      }  
      break  
  
    case "semaine":  
      startDate = getMonthStart(currentDate)  
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)  
      let weekCount = 1  
      const currentWeek = getWeekStart(startDate)  
  
      while (currentWeek <= monthEnd) {  
        const salesData = generateSalesData(currentWeek.toISOString(), weekCount)  
        data.push({  
          period: `S${weekCount}`,  
          butane: salesData.butane,  
          propane: salesData.propane,  
          fullDate: formatDate(currentWeek, "week"),  
        })  
        currentWeek.setDate(currentWeek.getDate() + 7)  
        weekCount++  
        if (weekCount > 6) break  
      }  
      break  
  
    case "mois":  
      startDate = getYearStart(currentDate)  
      const monthNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"]  
  
      for (let i = 0; i < 12; i++) {  
        const monthDate = new Date(startDate.getFullYear(), i, 1)  
        const salesData = generateSalesData(monthDate.toISOString(), i)  
        data.push({  
          period: monthNames[i],  
          butane: salesData.butane,  
          propane: salesData.propane,  
          fullDate: formatDate(monthDate, "month"),  
        })  
      }  
      break  
  }  
  
  return data  
}  
  
export default function Dashboard() {  
  const [selectedPeriod, setSelectedPeriod] = useState("jour")  
  const [currentDate, setCurrentDate] = useState(new Date())  
  
  const currentData = generateDataForPeriod(selectedPeriod, currentDate)  
  
  // Calcul des totaux pour les cards  
  const totalButane = currentData.reduce((sum, item) => sum + item.butane, 0)  
  const totalPropane = currentData.reduce((sum, item) => sum + item.propane, 0)  
  const totalVentes = totalButane + totalPropane  
  
  const handlePeriodChange = (newPeriod) => {  
    setSelectedPeriod(newPeriod)  
  }  
  
  const navigatePeriod = (direction) => {  
    const amount = direction === "prev" ? -1 : 1  
    const newDate = addPeriod(currentDate, selectedPeriod, amount)  
    setCurrentDate(newDate)  
  }  
  
  const goToToday = () => {  
    setCurrentDate(new Date())  
  }  
  
  const getCurrentPeriodLabel = () => {  
    switch (selectedPeriod) {  
      case "jour":  
        const weekStart = getWeekStart(currentDate)  
        const weekEnd = new Date(weekStart)  
        weekEnd.setDate(weekStart.getDate() + 6)  
        return `${weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${weekEnd.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`  
  
      case "semaine":  
        return formatDate(currentDate, "month")  
  
      case "mois":  
        return formatDate(currentDate, "year")  
  
      default:  
        return ""  
    }  
  }  
  
  const getPeriodTitle = () => {  
    switch (selectedPeriod) {  
      case "jour":  
        return "Semaine du"  
      case "semaine":  
        return "Mois de"  
      case "mois":  
        return "Année"  
      default:  
        return ""  
    }  
  }  
  
  return (  
    <div className="dashboard-layout">    
          
      <div className="dashboard-wrapper">  
        <div className="dashboard-container">  
          <div className="dashboard-content">  
            {/* Header */}  
            <div className="dashboard-header">  
              <h1 className="dashboard-title">Dashboard des Ventes</h1>   
            </div>  
  
            {/* Cards statistiques */}  
            <div className="dashboard-stats-grid">  
              {/* Card 1 - Ventes totales */}  
              <div className="dashboard-stat-card gradient-card">  
                <div className="dashboard-stat-card-header">  
                  <div className="dashboard-stat-content">  
                    <h3 className="dashboard-stat-label">Ventes Totales</h3>  
                    <div className="dashboard-stat-value">{totalVentes.toLocaleString()}</div>  
                    <p className="dashboard-stat-change positive">+12.5% par rapport à la période précédente</p>  
                  </div>  
                </div>  
                {/* Image qui sort du bas et peut dépasser du haut */}  
                <div className="card-image-container">    
                  <img src={butaneImage} alt="Ventes" className="card-image" />    
                </div>  
              </div>  
              
              {/* Card 2 - Ventes Butane */}  
              <div className="dashboard-stat-card gradient-card">  
                <div className="dashboard-stat-card-header">  
                  <div className="dashboard-stat-content">  
                    <h3 className="dashboard-stat-label">Ventes Butane</h3>  
                    <div className="dashboard-stat-value">{totalButane.toLocaleString()}</div>  
                    <p className="dashboard-stat-change positive">+8.2% par rapport à la période précédente</p>  
                  </div>  
                </div>  
                <div className="card-image-container">  
                  <img src={butaneImage} alt="Ventes" className="card-image" />  
                </div>  
              </div>  
              
              {/* Card 3 - Ventes Propane */}  
              <div className="dashboard-stat-card gradient-card">  
                <div className="dashboard-stat-card-header">  
                  <div className="dashboard-stat-content">  
                    <h3 className="dashboard-stat-label">Ventes Propane</h3>  
                    <div className="dashboard-stat-value">{totalPropane.toLocaleString()}</div>  
                    <p className="dashboard-stat-change negative">-2.1% par rapport à la période précédente</p>  
                  </div>  
                </div>  
                <div className="card-image-container">    
                  <img src={propaneImage} alt="Ventes" className="card-image" />    
                </div>  
              </div>  
            </div> 
  
            {/* Section graphique */}  
            <div className="chart-card">  
              <div className="chart-header">  
                <div className="chart-title-section">  
                  <div className="chart-title-container">  
                    <h3 className="chart-title">  
                      Statistiques des ventes de bouteilles  
                    </h3>  
                    <p className="chart-subtitle">Comparaison des ventes entre Butane et Propane</p>  
                  </div>  
  
                  {/* Filtres de période */}  
                  <div className="period-filters">  
                    <button  
                      className={`period-button ${selectedPeriod === "jour" ? "active" : "outline"}`}  
                      onClick={() => handlePeriodChange("jour")}  
                    >  
                      Jour  
                    </button>  
                    <button  
                      className={`period-button ${selectedPeriod === "semaine" ? "active" : "outline"}`}  
                      onClick={() => handlePeriodChange("semaine")}  
                    >  
                      Semaine  
                    </button>  
                    <button  
                      className={`period-button ${selectedPeriod === "mois" ? "active" : "outline"}`}  
                      onClick={() => handlePeriodChange("mois")}  
                    >  
                      Mois  
                    </button>  
                  </div>  
                </div>  
  
                {/* Navigation des dates */}  
                <div className="date-navigation">  
                  <button  
                    className="nav-button"  
                    onClick={() => navigatePeriod("prev")}  
                  >  
                    <ChevronLeft className="nav-icon" />  
                    <span>Précédent</span>  
                  </button>  
  
                  <div className="date-info">  
                    <div className="date-display">  
                      <Calendar className="calendar-icon" />  
                      <span>{getPeriodTitle()}</span>  
                      <span className="current-period">{getCurrentPeriodLabel()}</span>  
                    </div>  
  
                    <button  
                      className="today-button"  
                      onClick={goToToday}  
                      title="Retour à aujourd'hui"  
                    >  
                      <RotateCcw className="today-icon" />  
                      <span>Aujourd'hui</span>  
                    </button>  
                  </div>  
  
                  <button  
                    className="nav-button"  
                    onClick={() => navigatePeriod("next")}  
                  >  
                    <span>Suivant</span>  
                    <ChevronRight className="nav-icon" />  
                  </button>  
                </div>  
              </div>  
  
              {/* Graphique Recharts avec axes X et Y */}  
              <div className="chart-container">  
                <ResponsiveContainer width="100%" height={400}>  
                  <BarChart  
                    data={currentData}  
                    margin={{  
                      top: 20,  
                      right: 30,  
                      left: 20,  
                      bottom: 5,  
                    }}  
                  >  
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />  
                    <XAxis   
                      dataKey="period"   
                      tick={{ fontSize: 12, fill: '#6b7280' }}  
                      axisLine={{ stroke: '#e5e7eb' }}  
                      tickLine={{ stroke: '#e5e7eb' }}  
                    />  
                    <YAxis   
                      tick={{ fontSize: 12, fill: '#6b7280' }}  
                      axisLine={{ stroke: '#e5e7eb' }}  
                      tickLine={{ stroke: '#e5e7eb' }}  
                    />  
                    <Tooltip   
                      contentStyle={{  
                        backgroundColor: 'white',  
                        border: '1px solid #e5e7eb',  
                        borderRadius: '8px',  
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'  
                      }}  
                      labelStyle={{ color: '#374151', fontWeight: '600' }}  
                    />  
                    <Legend   
                      wrapperStyle={{ paddingTop: '20px' }}  
                    />  
                    <Bar   
                      dataKey="butane"   
                      fill="#1F55A3"   
                      name="Butane"   
                      radius={[4, 4, 0, 0]}  
                    />  
                    <Bar   
                      dataKey="propane"   
                      fill="#4DAEBD"   
                      name="Propane"   
                      radius={[4, 4, 0, 0]}   
                    />  
                  </BarChart> 
                </ResponsiveContainer>  
              </div>  
            </div>  
  
            {/* Informations supplémentaires */}  
            <div className="info-grid">  
              <div className="info-card">  
                <div className="info-card-header">  
                  <h4 className="info-title">Résumé de la période</h4>  
                </div>  
                <div className="info-content">  
                  <div className="info-row">  
                    <span className="info-label">Produit le plus vendu:</span>  
                    <span className="info-value">{totalButane > totalPropane ? "Butane" : "Propane"}</span>  
                  </div>  
                  <div className="info-row">  
                    <span className="info-label">Différence:</span>  
                    <span className="info-value">{Math.abs(totalButane - totalPropane).toLocaleString()} unités</span>  
                  </div>  
                  <div className="info-row">  
                    <span className="info-label">Période actuelle:</span>  
                    <span className="info-value info-period">{getCurrentPeriodLabel()}</span>  
                  </div>  
                  <div className="info-row">  
                    <span className="info-label">Type de vue:</span>  
                    <span className="info-value period-type">{selectedPeriod}</span>  
                  </div>  
                </div>  
              </div>  
  
              <div className="info-card">  
                <div className="info-card-header">  
                  <h4 className="info-title">Répartition des ventes</h4>  
                </div>  
                <div className="info-content">  
                  <div className="info-row">  
                    <div className="legend-item">  
                      <div className="legend-color butane"></div>  
                      <span>Butane</span>  
                    </div>  
                    <span className="info-value">{((totalButane / totalVentes) * 100).toFixed(1)}%</span>  
                  </div>  
                  <div className="info-row">  
                    <div className="legend-item">  
                      <div className="legend-color propane"></div>  
                      <span>Propane</span>  
                    </div>  
                    <span className="info-value">{((totalPropane / totalVentes) * 100).toFixed(1)}%</span>  
                  </div>  
                  <div className="help-section">  
                    <div className="help-text">  
                      📅 Navigation infinie : explorez toutes les périodes passées et futures !  
                    </div>  
                    <div className="help-text">  
                      🔄 Cliquez sur "Aujourd'hui" pour revenir à la période actuelle  
                    </div>  
                  </div>  
                </div>  
              </div>  
            </div>  
          </div>  
        </div>  
      </div>  
    </div>  
  )  
}