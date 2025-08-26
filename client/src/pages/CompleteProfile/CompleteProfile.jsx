import { useState } from "react";  
import { User, Building, AlertCircle } from "lucide-react";  
import { authService } from "../../services/authService";  
import "./CompleteProfile.css";  
  
const CompleteProfile = ({ googleProfile }) => {  
  const [userType, setUserType] = useState("PHYSIQUE");  
  const [isLoading, setIsLoading] = useState(false);  
  const [error, setError] = useState("");  
  
  // Pré-remplir avec les données Google  
  const [physicalData, setPhysicalData] = useState({  
    first_name: googleProfile?.given_name || "",  
    last_name: googleProfile?.family_name || "",  
    civilite: "M",  
    telephone_principal: "",  
    adresse_principale: "",  
    region_principale: ""  
  });  
  
  // Définition de moralData pour les entreprises  
  const [moralData, setMoralData] = useState({  
    raison_sociale: "",  
    ice: "",  
    patente: "",  
    rc: "",  
    ville_rc: "",  
    telephone_principal: "",  
    adresse_principale: "",  
    ville: "Casablanca",  
    region_principale: ""  
  });  
  
  const handlePhysicalChange = (e) => {  
    setPhysicalData(prev => ({  
      ...prev,  
      [e.target.name]: e.target.value  
    }));  
  };  
  
  const handleMoralChange = (e) => {  
    setMoralData(prev => ({  
      ...prev,  
      [e.target.name]: e.target.value  
    }));  
  };  
  
  const handleSubmit = async (e) => {  
    e.preventDefault();  
    setIsLoading(true);  
    setError("");  
  
    try {  
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/auth/complete-profile`, {  
        method: "POST",  
        headers: {  
          "Content-Type": "application/json",  
          "Authorization": `Bearer ${authService.getToken()}`  
        },  
        body: JSON.stringify({  
          type_personne: userType,  
          profile: userType === 'PHYSIQUE' ? physicalData : moralData  
        })  
      });  
  
      const data = await response.json();  
      if (data.success) {  
        window.location.href = '/Command';  
      } else {  
        throw new Error(data.message);  
      }  
    } catch (error) {  
      console.error('Erreur:', error);  
      setError(error.message || 'Une erreur est survenue');  
    } finally {  
      setIsLoading(false);  
    }  
  };  
  
  return (  
    <div className="complete-profile-container">  
      <div className="complete-profile-content">  
        <div className="complete-profile-header">  
          <h1 className="complete-profile-title">Complétez votre profil</h1>  
          <p className="complete-profile-subtitle">  
            Quelques informations supplémentaires pour finaliser votre inscription  
          </p>  
        </div>  
  
        {error && (  
          <div className="error-message">  
            <AlertCircle className="error-icon" />  
            <span>{error}</span>  
          </div>  
        )}  
  
        <div className="user-type-selection">  
          <button  
            type="button"  
            onClick={() => setUserType("PHYSIQUE")}  
            className={`user-type-button ${userType === "PHYSIQUE" ? "active" : ""}`}  
          >  
            <User className="user-type-icon" />  
            <span className="user-type-label">Particulier</span>  
          </button>  
          <button  
            type="button"  
            onClick={() => setUserType("MORAL")}  
            className={`user-type-button ${userType === "MORAL" ? "active" : ""}`}  
          >  
            <Building className="user-type-icon" />  
            <span className="user-type-label">Entreprise</span>  
          </button>  
        </div>  
  
        <form onSubmit={handleSubmit} className="complete-profile-form">  
          {userType === "PHYSIQUE" && (  
            <>  
              <div className="form-row">  
                <div className="form-group">  
                  <label htmlFor="civilite" className="form-label">Civilité *</label>  
                  <select  
                    id="civilite"  
                    name="civilite"  
                    value={physicalData.civilite}  
                    onChange={handlePhysicalChange}  
                    className="form-select"  
                    required  
                  >  
                    <option value="M">M.</option>  
                    <option value="Mme">Mme</option>  
                    <option value="Mlle">Mlle</option>  
                  </select>  
                </div>  
                <div className="form-group">  
                  <label htmlFor="first_name" className="form-label">Prénom *</label>  
                  <input  
                    id="first_name"  
                    name="first_name"  
                    type="text"  
                    placeholder="Votre prénom"  
                    value={physicalData.first_name}  
                    onChange={handlePhysicalChange}  
                    className="form-input"  
                    required  
                  />  
                </div>  
              </div>  
  
              <div className="form-group">  
                <label htmlFor="last_name" className="form-label">Nom *</label>  
                <input  
                  id="last_name"  
                  name="last_name"  
                  type="text"  
                  placeholder="Votre nom"  
                  value={physicalData.last_name}  
                  onChange={handlePhysicalChange}  
                  className="form-input"  
                  required  
                />  
              </div>  
  
              <div className="form-group">  
                <label htmlFor="region_principale" className="form-label">Région *</label>  
                <select  
                  id="region_principale"  
                  name="region_principale"  
                  value={physicalData.region_principale}  
                  onChange={handlePhysicalChange}  
                  className="form-select"  
                  required  
                >  
                  <option value="">Sélectionner une région</option>  
                  <option value="2 Mars">2 Mars</option>  
                  <option value="Maarif">Maarif</option>  
                  <option value="Bir Anzarane">Bir Anzarane</option>  
                  <option value="Boulevard al qods">Boulevard al qods</option>  
                </select>  
              </div>  
            </>  
          )}  
  
          {userType === "MORAL" && (  
            <>  
              <div className="form-group">  
                <label htmlFor="raison_sociale" className="form-label">Raison sociale *</label>  
                <input  
                  id="raison_sociale"  
                  name="raison_sociale"  
                  type="text"  
                  placeholder="Nom de l'entreprise"  
                  value={moralData.raison_sociale}  
                  onChange={handleMoralChange}  
                  className="form-input"  
                  required  
                />  
              </div>  
  
              <div className="form-row">  
                <div className="form-group">  
                  <label htmlFor="ice" className="form-label">ICE</label>  
                  <input  
                    id="ice"  
                    name="ice"  
                    type="text"  
                    placeholder="Numéro ICE"  
                    value={moralData.ice}  
                    onChange={handleMoralChange}  
                    className="form-input"  
                  />  
                </div>  
                <div className="form-group">  
                  <label htmlFor="rc" className="form-label">RC</label>  
                  <input  
                    id="rc"  
                    name="rc"  
                    type="text"  
                    placeholder="Registre de commerce"  
                    value={moralData.rc}  
                    onChange={handleMoralChange}  
                    className="form-input"  
                  />  
                </div>  
              </div>  
  
              <div className="form-group">  
                <label htmlFor="region_principale_moral" className="form-label">Quartier *</label>  
                <select  
                  id="region_principale_moral"  
                  name="region_principale"  
                  value={moralData.region_principale}  
                  onChange={handleMoralChange}  
                  className="form-select"  
                  required  
                >  
                  <option value="">Sélectionner un quartier</option>  
                  <option value="2 Mars">2 Mars</option>  
                  <option value="Maarif">Maarif</option>  
                  <option value="Bir Anzarane">Bir Anzarane</option>  
                  <option value="Boulevard al qods">Boulevard al qods</option>  
                </select>  
              </div>  
            </>  
          )}  
  
          <div className="form-group">  
            <label htmlFor="telephone_principal" className="form-label">Téléphone principal *</label>  
            <input  
              id="telephone_principal"  
              name="telephone_principal"  
              type="tel"  
              placeholder="+212 6XX XXX XXX"  
              value={userType === "PHYSIQUE" ? physicalData.telephone_principal : moralData.telephone_principal}  
              onChange={userType === "PHYSIQUE" ? handlePhysicalChange : handleMoralChange}  
              className="form-input"  
              required  
            />  
          </div>  
  
          <div className="form-group">  
            <label htmlFor="adresse_principale" className="form-label">Adresse principale</label>  
            <textarea  
              id="adresse_principale"  
              name="adresse_principale"  
              placeholder="Votre adresse complète"  
              value={userType === "PHYSIQUE" ? physicalData.adresse_principale : moralData.adresse_principale}  
              onChange={userType === "PHYSIQUE" ? handlePhysicalChange : handleMoralChange}  
              className="form-input"  
              rows="3"  
            />  
          </div>  
  
          <div className="form-actions">  
            <button  
              type="submit"  
              className={`btn-primary ${isLoading ? "btn-loading" : ""}`}  
              disabled={isLoading}  
            >  
              {isLoading ? "Finalisation..." : "Finaliser mon inscription"}  
            </button>  
          </div>  
        </form>  
      </div>  
    </div>  
  );  
};  
  
export default CompleteProfile;