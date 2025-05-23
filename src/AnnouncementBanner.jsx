import React, { useEffect } from 'react';

const AnnouncementBanner = ({ message, visible, onHide }) => {
  useEffect(() => {
    if (visible) {
      const timeout = setTimeout(() => onHide(), 4000); // auto-hide after 5s
      return () => clearTimeout(timeout);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.messageBox}>
        <h1 style={styles.message}>{message}</h1>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageBox: {
    backgroundColor: '#ffffff',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 0 20px rgba(0,0,0,0.3)',
    textAlign: 'center',
    maxWidth: '90%',
  },
  message: {
    fontSize: '2rem',
    color: '#333',
    margin: 0,
  }
};

export default AnnouncementBanner;
