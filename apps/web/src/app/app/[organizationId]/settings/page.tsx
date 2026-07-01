"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);

  function save(e: React.FormEvent) {
    e.preventDefault();

    // TODO
    // POST /settings

    setSaved(true);

    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <section className="settings-header">
        <div>
          <p className="settings-eyebrow">System Settings</p>

          <h1>Workspace Configuration</h1>

          <span>
            Configure your organization, email server, branding, notifications and platform
            preferences.
          </span>
        </div>
      </section>

      <form className="settings-grid" onSubmit={save}>
        <article className="settings-card">
          <h2>Organization</h2>

          <label>
            Organization Name
            <input placeholder="Workspace organization name" />
          </label>

          <label>
            Legal Name
            <input defaultValue="Meta Global Vision Holding" />
          </label>

          <label>
            Slug
            <input placeholder="workspace-slug" />
          </label>
        </article>

        <article className="settings-card">
          <h2>Branding</h2>

          <label>
            Application Name
            <input defaultValue="Asset Hub" />
          </label>

          <label>
            Primary Color
            <input type="color" defaultValue="#ff6b35" />
          </label>

          <label>
            Upload Logo
            <input type="file" />
          </label>
        </article>

        <article className="settings-card">
          <h2>Email (SMTP)</h2>

          <label>
            SMTP Host
            <input placeholder="smtp.office365.com" />
          </label>

          <label>
            SMTP Port
            <input defaultValue="587" />
          </label>

          <label>
            Username
            <input />
          </label>

          <label>
            Password
            <input type="password" />
          </label>
        </article>

        <article className="settings-card">
          <h2>Notifications</h2>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Email Notifications
          </label>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Lease Expiration Alerts
          </label>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Maintenance Alerts
          </label>

          <label className="switch">
            <input type="checkbox" />
            Weekly Reports
          </label>
        </article>

        <article className="settings-card">
          <h2>Security</h2>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Two Factor Authentication
          </label>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Login Notifications
          </label>

          <label className="switch">
            <input type="checkbox" defaultChecked />
            Session Timeout (30 min)
          </label>
        </article>

        <article className="settings-card">
          <h2>Payments</h2>

          <label>
            Stripe Publishable Key
            <input />
          </label>

          <label>
            Stripe Secret Key
            <input type="password" />
          </label>

          <label>
            Webhook Secret
            <input />
          </label>
        </article>
      </form>

      <div className="settings-footer">
        <button className="save-btn" type="submit">
          Save Changes
        </button>

        {saved && <span className="saved">✓ Settings saved successfully.</span>}
      </div>

      <style jsx>{`

.settings-header{

margin-bottom:28px;

}

.settings-eyebrow{

margin:0;

font-size:12px;

font-weight:800;

letter-spacing:.15em;

text-transform:uppercase;

color:#ff6b35;

}

.settings-header h1{

margin:8px 0;

font-size:34px;

}

.settings-header span{

color:#64748b;

}

.settings-grid{

display:grid;

grid-template-columns:repeat(2,1fr);

gap:20px;

}

.settings-card{

background:white;

border:1px solid #e5e7eb;

border-radius:20px;

padding:24px;

box-shadow:0 10px 30px rgba(15,23,42,.05);

}

.settings-card h2{

margin-top:0;

margin-bottom:18px;

font-size:20px;

}

.settings-card label{

display:flex;

flex-direction:column;

gap:8px;

margin-bottom:18px;

font-size:14px;

font-weight:600;

}

.settings-card input{

height:48px;

border:1px solid #d1d5db;

border-radius:12px;

padding:0 14px;

font:inherit;

}

.switch{

display:flex!important;

flex-direction:row!important;

align-items:center;

gap:12px;

}

.switch input{

width:18px;

height:18px;

}

.settings-footer{

display:flex;

align-items:center;

gap:20px;

margin-top:30px;

}

.save-btn{

height:52px;

padding:0 30px;

border:none;

border-radius:14px;

background:#ff6b35;

color:white;

font-size:15px;

font-weight:800;

cursor:pointer;

}

.saved{

font-weight:700;

color:#16a34a;

}

@media(max-width:900px){

.settings-grid{

grid-template-columns:1fr;

}

}

      `}</style>
    </>
  );
}
