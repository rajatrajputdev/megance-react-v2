import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const { user, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";

  const onSubmit = async (e) => {
    e.preventDefault();
    await login({ email, name });
    navigate(from, { replace: true });
  };

  if (user) {
    return (
      <section className="container page-section text-center">
        <h3>You are logged in as {user.name}</h3>
        <button className="butn butn-md butn-rounded mt-20" onClick={() => logout()}>Logout</button>
      </section>
    );
  }

  return (
    <section className="container page-section">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="p-20 card-like">
            <h3 className="mb-20">Login</h3>
            <form onSubmit={onSubmit}>
              <div className="mb-10">
                <label>Name</label>
                <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="mb-10">
                <label>Email</label>
                <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button className="butn butn-md butn-rounded mt-10" type="submit">Login</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
