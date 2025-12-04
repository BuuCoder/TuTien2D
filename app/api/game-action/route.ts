import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter } from '@/lib/api/rate-limiter';
import {
    handleBuyItem,
    handleBuyPotion,
    handleAcceptQuest,
    handleRepairWeapon,
} from '@/lib/api/action-handlers';
import {
    GameActionType,
    GameActionRequestData,
    GameActionResponse,
} from '@/lib/types/api';
import { parseRequestBody } from '@/lib/deobfuscateMiddleware';

/**
 * Get user identifier from request (IP address)
 */
function getUserId(request: NextRequest): string {
    // Try to get real IP from headers (for proxies/load balancers)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        return forwardedFor.split(',')[0].trim();
    }

    const realIp = request.headers.get('x-real-ip');
    if (realIp) {
        return realIp;
    }

    // Fallback to a default for local development
    return 'local-user';
}

/**
 * Validate request body
 */
function validateRequest(body: any): { valid: boolean; error?: string } {
    if (!body || typeof body !== 'object') {
        return { valid: false, error: 'Invalid request body' };
    }

    if (!body.actionType || !Object.values(GameActionType).includes(body.actionType)) {
        return { valid: false, error: 'Invalid or missing actionType' };
    }

    // Validate required fields based on action type
    switch (body.actionType) {
        case GameActionType.BUY_ITEM:
        case GameActionType.BUY_POTION:
            if (!body.itemId || !body.itemName || typeof body.price !== 'number') {
                return { valid: false, error: 'Missing required fields: itemId, itemName, price' };
            }
            break;

        case GameActionType.ACCEPT_QUEST:
            if (!body.questId || !body.questName) {
                return { valid: false, error: 'Missing required fields: questId, questName' };
            }
            break;

        case GameActionType.REPAIR_WEAPON:
            if (!body.weaponId || !body.weaponName || typeof body.repairCost !== 'number') {
                return { valid: false, error: 'Missing required fields: weaponId, weaponName, repairCost' };
            }
            break;
    }

    return { valid: true };
}

/**
 * Unified Game Action API Endpoint
 * Handles: BUY_ITEM, BUY_POTION, ACCEPT_QUEST, REPAIR_WEAPON
 */
export async function POST(request: NextRequest) {
    const userId = getUserId(request);

    // Try to acquire rate limit lock
    if (!rateLimiter.acquireLock(userId)) {
        console.log(`[API] Rate limit exceeded for user: ${userId}`);
        return NextResponse.json(
            {
                success: false,
                error: 'Too many requests. Please wait for your current request to complete.',
                retryAfter: 1000, // milliseconds
            },
            { status: 429 } // Too Many Requests
        );
    }

    try {
        // Parse request body
        const body: GameActionRequestData = await parseRequestBody(request);

        // Validate request
        const validation = validateRequest(body);
        if (!validation.valid) {
            return NextResponse.json(
                {
                    success: false,
                    error: validation.error,
                },
                { status: 400 } // Bad Request
            );
        }

        console.log(`[API] Processing ${body.actionType} for user: ${userId}`);

        // Route to appropriate handler
        let response: GameActionResponse;

        switch (body.actionType) {
            case GameActionType.BUY_ITEM:
                response = await handleBuyItem(body);
                break;

            case GameActionType.BUY_POTION:
                response = await handleBuyPotion(body);
                break;

            case GameActionType.ACCEPT_QUEST:
                response = await handleAcceptQuest(body);
                break;

            case GameActionType.REPAIR_WEAPON:
                response = await handleRepairWeapon(body);
                break;

            default:
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Unknown action type',
                    },
                    { status: 400 }
                );
        }

        return NextResponse.json(response, { status: 200 });

    } catch (error) {
        console.error('[API] Error processing request:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 } // Internal Server Error
        );
    } finally {
        // Always release the lock
        rateLimiter.releaseLock(userId);
    }
}
