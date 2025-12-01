// Game Action Types
export enum GameActionType {
    BUY_ITEM = 'BUY_ITEM',
    BUY_POTION = 'BUY_POTION',
    ACCEPT_QUEST = 'ACCEPT_QUEST',
    REPAIR_WEAPON = 'REPAIR_WEAPON',
}

// Base request interface
export interface GameActionRequest {
    actionType: GameActionType;
}

// Buy Item Request
export interface BuyItemRequest extends GameActionRequest {
    actionType: GameActionType.BUY_ITEM;
    itemId: string;
    itemName: string;
    price: number;
    category?: string;
}

// Buy Potion Request
export interface BuyPotionRequest extends GameActionRequest {
    actionType: GameActionType.BUY_POTION;
    itemId: string;
    itemName: string;
    price: number;
}

// Accept Quest Request
export interface AcceptQuestRequest extends GameActionRequest {
    actionType: GameActionType.ACCEPT_QUEST;
    questId: string;
    questName: string;
}

// Repair Weapon Request
export interface RepairWeaponRequest extends GameActionRequest {
    actionType: GameActionType.REPAIR_WEAPON;
    weaponId: string;
    weaponName: string;
    repairCost: number;
}

// Union type for all requests
export type GameActionRequestData =
    | BuyItemRequest
    | BuyPotionRequest
    | AcceptQuestRequest
    | RepairWeaponRequest;

// Response interfaces
export interface GameActionResponse {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

export interface RateLimitError {
    success: false;
    error: string;
    retryAfter?: number;
}
