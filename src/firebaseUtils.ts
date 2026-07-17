import { db } from './firebase';
import { doc, setDoc, onSnapshot, updateDoc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { CampaignState, RollResult } from './types';

export interface RoomUser {
  id: string;
  name: string;
  assignedPlayerId: string | null;
  notes: string;
}

export interface RoomState {
  campaign: CampaignState;
  users: Record<string, RoomUser>;
  participantRolls?: RollResult[];
}

// Generate a random 6-digit PIN
export const generatePin = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createRoom = async (initialState: CampaignState): Promise<string> => {
  const pin = generatePin();
  const roomRef = doc(db, 'rooms', pin);
  
  // Make sure it doesn't exist
  const existing = await getDoc(roomRef);
  if (existing.exists()) {
    return createRoom(initialState); // retry
  }

  await setDoc(roomRef, {
    campaign: initialState,
    users: {}
  });
  
  return pin;
};

export const updateRoomCampaign = async (pin: string, campaign: CampaignState) => {
  const roomRef = doc(db, 'rooms', pin);
  await updateDoc(roomRef, {
    campaign
  });
};

export const joinRoom = async (pin: string, userId: string, userName: string) => {
  const roomRef = doc(db, 'rooms', pin);
  const snap = await getDoc(roomRef);
  if (!snap.exists()) {
    throw new Error('Stanza non trovata');
  }
  
  const data = snap.data();
  if (!data.users || !data.users[userId]) {
    await setDoc(roomRef, {
      [`users.${userId}`]: {
        id: userId,
        name: userName,
        assignedPlayerId: null,
        notes: ''
      }
    }, { merge: true });
  }
};

export const subscribeToRoom = (pin: string, callback: (data: RoomState | null) => void) => {
  const roomRef = doc(db, 'rooms', pin);
  return onSnapshot(roomRef, (snap) => {
    if (snap.exists()) {
      callback(snap.data() as RoomState);
    } else {
      callback(null);
    }
  });
};

export const updateUser = async (pin: string, userId: string, updates: Partial<RoomUser>) => {
  const roomRef = doc(db, 'rooms', pin);
  
  const updateObj: Record<string, any> = {};
  for (const [key, val] of Object.entries(updates)) {
    updateObj[`users.${userId}.${key}`] = val;
  }
  
  await updateDoc(roomRef, updateObj);
};

export const pushParticipantRoll = async (pin: string, roll: RollResult) => {
  const roomRef = doc(db, 'rooms', pin);
  const snap = await getDoc(roomRef);
  if (snap.exists()) {
    const currentRolls = snap.data().participantRolls || [];
    await updateDoc(roomRef, {
      participantRolls: [roll, ...currentRolls].slice(0, 10) // keep last 10
    });
  }
};

