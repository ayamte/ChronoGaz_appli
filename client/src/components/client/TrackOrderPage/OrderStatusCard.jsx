import React from "react";  
  
const OrderStatusCard = ({ orderNumber, statusDescription, estimatedTime }) => {  
  return (  
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">  
      <div className="text-center">  
        <h2 className="text-2xl font-bold mb-2" style={{color: '#1F55A3'}}>  
          Commande #{orderNumber || 'N/A'}  
        </h2>  
        <p className="text-lg text-gray-600 mb-4">  
          {statusDescription || 'Suivi de votre commande'}  
        </p>  
        {estimatedTime && (  
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full text-white font-medium"   
               style={{backgroundColor: '#4DAEBD'}}>  
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">  
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>  
            </svg>  
            <span>Temps estimé d'arrivée: {estimatedTime}</span>  
          </div>  
        )}  
      </div>  
    </div>  
  );  
};  
  
export default OrderStatusCard;
