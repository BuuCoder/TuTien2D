// NPC Data với items và quests khác nhau cho mỗi map

export interface NPCItem {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
}

export interface NPCCategory {
    id: string;
    name: string;
    items: NPCItem[];
}

export interface NPCQuest {
    id: string;
    name: string;
    description: string;
    reward: number;
    image: string;
}

export interface NPCData {
    message: string;
    menu?: NPCCategory[];
    quests?: NPCQuest[];
}

export const NPC_DATA: Record<string, NPCData> = {
    // ===== LÀNG TÂN THỦ (MAP1) =====
    'merchant': {
        message: 'Chào mừng đến cửa hàng! Đây là nơi cho tân thủ.',
        menu: [
            {
                id: 'weapons',
                name: 'Vũ khí cơ bản',
                items: [
                    { id: 'sword1', name: 'Kiếm gỗ', price: 50, image: '🗡️', description: 'Vũ khí cơ bản cho tân thủ' },
                    { id: 'bow1', name: 'Cung nhỏ', price: 80, image: '🏹', description: 'Cung bắn xa tầm ngắn' },
                ]
            },
            {
                id: 'potions',
                name: 'Thuốc',
                items: [
                    { id: 'hp1', name: 'Thuốc HP nhỏ', price: 20, image: '🧪', description: 'Hồi 50 HP' },
                    { id: 'mp1', name: 'Thuốc MP nhỏ', price: 15, image: '💙', description: 'Hồi 30 MP' },
                ]
            }
        ]
    },
    'healer': {
        message: 'Ta có thể chữa lành vết thương của ngươi.',
        menu: [
            {
                id: 'healing',
                name: 'Dịch vụ hồi phục',
                items: [
                    { id: 'heal-hp', name: 'Hồi HP đầy', price: 50, image: '❤️', description: 'Hồi phục toàn bộ HP' },
                    { id: 'heal-mp', name: 'Hồi MP đầy', price: 40, image: '💙', description: 'Hồi phục toàn bộ MP' },
                ]
            }
        ]
    },
    'elder': {
        message: 'Chào ngươi, dũng sĩ trẻ! Ta có nhiệm vụ cho ngươi.',
        menu: [
            {
                id: 'shop',
                name: 'Cửa hàng đặc biệt',
                items: [
                    { id: 'scroll1', name: 'Cuộn dịch chuyển', price: 100, image: '📜', description: 'Dịch chuyển về làng' },
                ]
            }
        ],
        quests: [
            { id: 'quest1', name: 'Khám phá rừng', description: 'Đi đến Rừng Hắc Ám và quay về', reward: 100, image: '🌲' },
            { id: 'quest2', name: 'Thu thập thảo mộc', description: 'Thu thập 10 cây thảo dược', reward: 50, image: '🌿' },
        ]
    },

    // ===== RỪNG HẮC ÁM (MAP2) =====
    'forest-guard': {
        message: 'Dừng lại! Rừng này rất nguy hiểm. Hãy cẩn thận!',
        quests: [
            { id: 'quest3', name: 'Tiêu diệt quái vật', description: 'Giết 5 con sói trong rừng', reward: 200, image: '🐺' },
            { id: 'quest4', name: 'Bảo vệ rừng', description: 'Tuần tra khu vực rừng', reward: 150, image: '🛡️' },
        ]
    },

    // ===== THÀNH CHỦ (MAP3) =====
    'city-merchant': {
        message: 'Chào mừng đến thành phố! Ta có hàng hóa cao cấp.',
        menu: [
            {
                id: 'weapons',
                name: 'Vũ khí cao cấp',
                items: [
                    { id: 'sword3', name: 'Kiếm thép', price: 300, image: '⚔️', description: 'Vũ khí mạnh mẽ' },
                    { id: 'sword4', name: 'Kiếm bạc', price: 600, image: '🗡️', description: 'Kiếm quý hiếm' },
                    { id: 'bow2', name: 'Cung dài', price: 400, image: '🏹', description: 'Cung tầm xa' },
                    { id: 'staff1', name: 'Gậy phép', price: 500, image: '🪄', description: 'Tăng sức mạnh phép thuật' },
                ]
            },
            {
                id: 'armor',
                name: 'Giáp',
                items: [
                    { id: 'armor1', name: 'Áo giáp da', price: 200, image: '🦺', description: 'Giáp cơ bản' },
                    { id: 'armor2', name: 'Áo giáp sắt', price: 500, image: '🛡️', description: 'Giáp chắc chắn' },
                ]
            },
            {
                id: 'potions',
                name: 'Thuốc cao cấp',
                items: [
                    { id: 'hp3', name: 'Thuốc HP lớn', price: 80, image: '⚗️', description: 'Hồi 200 HP' },
                    { id: 'mp3', name: 'Thuốc MP lớn', price: 70, image: '💙', description: 'Hồi 150 MP' },
                    { id: 'buff1', name: 'Thuốc tăng sức', price: 100, image: '💪', description: 'Tăng 20% sát thương' },
                ]
            }
        ]
    },
    'city-healer': {
        message: 'Y viện thành phố chào đón ngươi.',
        menu: [
            {
                id: 'healing',
                name: 'Dịch vụ cao cấp',
                items: [
                    { id: 'heal-all', name: 'Hồi phục toàn bộ', price: 100, image: '✨', description: 'Hồi đầy HP và MP' },
                    { id: 'cure-poison', name: 'Giải độc', price: 60, image: '🧪', description: 'Loại bỏ độc' },
                    { id: 'revive', name: 'Hồi sinh', price: 200, image: '⚡', description: 'Hồi sinh đồng đội' },
                ]
            }
        ]
    },
    'city-guard-1': {
        message: 'Ta canh gác cổng thành. Có việc gì không?',
        quests: [
            { id: 'quest5', name: 'Tuần tra thành phố', description: 'Kiểm tra an ninh thành phố', reward: 150, image: '🏛️' },
        ]
    },
    'city-guard-2': {
        message: 'Chào dũng sĩ! Thành phố cần sự giúp đỡ.',
        quests: [
            { id: 'quest6', name: 'Bảo vệ thành phố', description: 'Đánh bại kẻ xâm lược', reward: 300, image: '⚔️' },
        ]
    },

    // ===== ĐỒNG CỎ XANH (MAP4) =====
    'farmer': {
        message: 'Chào bạn! Ta là nông dân ở đây. Cần gì không?',
        menu: [
            {
                id: 'food',
                name: 'Thực phẩm',
                items: [
                    { id: 'bread', name: 'Bánh mì', price: 10, image: '🍞', description: 'Hồi 30 HP' },
                    { id: 'apple', name: 'Táo', price: 5, image: '🍎', description: 'Hồi 20 HP' },
                    { id: 'meat', name: 'Thịt nướng', price: 30, image: '🍖', description: 'Hồi 80 HP' },
                ]
            },
            {
                id: 'seeds',
                name: 'Hạt giống',
                items: [
                    { id: 'seed1', name: 'Hạt lúa', price: 20, image: '🌾', description: 'Trồng lúa' },
                    { id: 'seed2', name: 'Hạt hoa', price: 15, image: '🌻', description: 'Trồng hoa' },
                ]
            }
        ],
        quests: [
            { id: 'quest7', name: 'Thu hoạch mùa màng', description: 'Giúp thu hoạch 20 bó lúa', reward: 100, image: '🌾' },
            { id: 'quest8', name: 'Đuổi sâu bọ', description: 'Tiêu diệt sâu bọ phá hoại', reward: 80, image: '🐛' },
        ]
    },

    // ===== HANG ĐỘNG BÍ ẨN (MAP5) =====
    'cave-merchant': {
        message: 'Ngươi tìm thấy ta rồi... Ta có những vật phẩm hiếm.',
        menu: [
            {
                id: 'rare-items',
                name: 'Vật phẩm hiếm',
                items: [
                    { id: 'sword5', name: 'Kiếm huyền thoại', price: 2000, image: '⚔️', description: 'Vũ khí cực mạnh' },
                    { id: 'armor3', name: 'Giáp rồng', price: 1500, image: '🛡️', description: 'Giáp tối thượng' },
                    { id: 'ring1', name: 'Nhẫn phép thuật', price: 1000, image: '💍', description: 'Tăng 50% MP' },
                    { id: 'amulet1', name: 'Bùa hộ mệnh', price: 800, image: '🔮', description: 'Giảm 30% sát thương nhận' },
                ]
            },
            {
                id: 'treasures',
                name: 'Kho báu',
                items: [
                    { id: 'gem1', name: 'Ngọc lục bảo', price: 500, image: '💎', description: 'Đá quý hiếm' },
                    { id: 'gem2', name: 'Ngọc hồng ngọc', price: 600, image: '💎', description: 'Đá quý cực hiếm' },
                    { id: 'gold-bar', name: 'Thỏi vàng', price: 1000, image: '🏆', description: 'Vàng nguyên chất' },
                ]
            }
        ]
    },

    // ===== CỬA HÀNG TRANG PHỤC (SKIN SHOP) =====
    'skin-merchant': {
        message: 'Chào mừng đến cửa hàng trang phục! Ta có nhiều bộ trang phục đẹp mắt.',
        menu: [
            {
                id: 'skins',
                name: 'Trang phục',
                items: [
                    { id: 'skin-warrior', name: 'Chiến Binh', price: 5000, image: '⚔️', description: 'Trang phục chiến binh dũng mãnh' },
                    { id: 'skin-assassin', name: 'Sát Thủ', price: 10000, image: '🗡️', description: 'Trang phục sát thủ tàng hình' },
                ]
            }
        ]
    },
};
