import React from "react";

const Footer = () => {
  return (
   <footer
  style={{
    backgroundColor: "#333",
    color: "#fff",
    textAlign: "center",
    fontSize: '0.9rem',
    height: '30px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  }}
>
  <p style={{ margin: 0 }}>
    Sponsored By: Kiratpal Singh Johal © {new Date().getFullYear()} 
  </p>
</footer>

  );
};

export default Footer;