import PropTypes from "prop-types";

const Loader = ({ message = "Loading..." }) => {
  return (
    <div className="loader-overlay">
      <div className="loader-container">
        <div className="spinner"></div>
        <p className="loader-message">{message}</p>
      </div>
    </div>
  );
};

Loader.propTypes = {
  message: PropTypes.string,
};

export default Loader;
