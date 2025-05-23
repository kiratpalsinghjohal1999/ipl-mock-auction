import React from "react";

const Footer = () => {
  return (
   <footer
  style={{
    position: "fixed", 
    align:'center',        // Fixes the footer
    top: 0,  
    left: 0,
    width: "100vw",               // Places it at the bottom             // Full width
    backgroundColor: "#333",
    color: "#fff",
    textAlign: "center",
    fontSize: "0.8rem",
    padding: "8px 0",          // Adds equal top & bottom padding
    zIndex: 1000            
  }}
>
  <p style={{ margin: 0 }}>
    Sponsored By: Kiratpal Singh Johal © {new Date().getFullYear()} 
  </p>
</footer>

  );
};

export default Footer;