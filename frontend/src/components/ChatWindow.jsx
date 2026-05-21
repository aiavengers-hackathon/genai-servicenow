export default function IncidentCard({ incident }) {
  if (!incident) return null;

  return (
    <div className="card">
      <h3>Incident Created</h3>

      <p>
        <strong>Number:</strong> {incident.number}
      </p>

      <p>
        <strong>Short Description:</strong>
        {incident.short_description}
      </p>

      <p>
        <strong>Sys ID:</strong>
        {incident.sys_id}
      </p>
    </div>
  );
}