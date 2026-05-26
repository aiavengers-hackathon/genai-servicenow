import React, { useEffect, useState } from "react";
import axios from "axios";

function RequestsPage() {

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    fetchRequests();

  }, []);

  async function fetchRequests() {

    try {

      const userId =
        localStorage.getItem("userId");

      const response =
        await axios.get(
          `http://localhost:5000/api/requests/user/${userId}`
        );

      setRequests(
        response.data.requests || []
      );

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);
    }
  }

  if (loading) {

    return (
      <div style={{ padding: 20 }}>
        Loading requests...
      </div>
    );
  }

  return (

    <div style={{ padding: 20 }}>

      <h2>My Requests</h2>

      {
        requests.length === 0 && (
          <p>No requests found.</p>
        )
      }

      {
        requests.map((req) => (

          <div
            key={req.number}
            style={{
              border: "1px solid #ccc",
              padding: 15,
              marginBottom: 10,
              borderRadius: 8,
            }}
          >

            <h3>{req.number}</h3>

            <p>
              {req.short_description}
            </p>

            <p>
              Status: {req.state}
            </p>

            <p>
              Created:
              {" "}
              {req.sys_created_on}
            </p>

          </div>
        ))
      }

    </div>
  );
}

export default RequestsPage;