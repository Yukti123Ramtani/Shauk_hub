const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/Hobby_hub:Yukti_123"

export const fetchUsers = async () => {
  const response = await fetch(`${API_BASE_URL}/users`);
  return response.json();
};

export const createUser = async (userData: any) => {
  const response = await fetch(`${API_BASE_URL}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });
  return response.json();
};

export const fetchRooms = async () => {
  const response = await fetch(`${API_BASE_URL}/rooms`);
  return response.json();
};

export const createRoom = async (roomData: any) => {
  const response = await fetch(`${API_BASE_URL}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(roomData),
  });
  return response.json();
};
