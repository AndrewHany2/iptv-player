const TVLoader = ({ message = "Loading…" }) => (
  <div className="tv-loader">
    <div className="tv-spinner" />
    <p className="tv-loader-msg">{message}</p>
  </div>
);

export default TVLoader;
