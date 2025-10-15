const rareItems = {
  basic: [
    { id: 'B1', name: 'Áo thun limited', sellPrice: 5000 },
    { id: 'B2', name: 'Quần jean rách', sellPrice: 10000 },
    { id: 'B3', name: 'Giày thể thao special', sellPrice: 15000 },
    { id: 'B4', name: 'Áo khoác phiên bản giới hạn', sellPrice: 20000 },
  ],
  accessory: [
    { id: 'A1', name: 'Vòng tay pha lê', sellPrice: 30000 },
    { id: 'A2', name: 'Nhẫn bạc đặc biệt', sellPrice: 50000 },
    { id: 'A3', name: 'Kính râm thời thượng', sellPrice: 40000 },
    { id: 'A4', name: 'Dây chuyền kim cương', sellPrice: 45000 },
  ],
  ultra: [
    { id: 'U1', name: 'Set đồ cao cấp', sellPrice: 100000 },
    { id: 'U2', name: 'Mũ hiệu ứng', sellPrice: 80000 },
    { id: 'U3', name: 'Túi xách branded', sellPrice: 120000 },
  ],
  ultra_rare: [
    { id: 'UR1', name: 'Set trang phục limited', sellPrice: 200000 },
    { id: 'UR2', name: 'Trang phục legendary', sellPrice: 250000 },
    { id: 'UR3', name: 'Set phụ kiện quý phái', sellPrice: 180000 },
  ],
  super_ultra_rare: [
    { id: 'SUR1', name: 'Trang phục thần thoại', sellPrice: 5000000 },
    { id: 'SUR2', name: 'Set đồ huyền bí', sellPrice: 6000000 },
    { id: 'SUR3', name: 'Phụ kiện vô giá', sellPrice: 7000000 },
    { id: 'SUR4', name: 'Áo choàng siêu cấp', sellPrice: 8000000 },
  ],
  ssur: [
    { id: 'SSUR1', name: 'Set trang phục tối thượng', sellPrice: 20000000 },
    { id: 'SSUR2', name: 'Trang phục thần linh', sellPrice: 24000000 },
    { id: 'SSUR3', name: 'Set phụ kiện huyền thoại', sellPrice: 28000000 },
    { id: 'SSUR4', name: 'Áo choàng vĩnh cửu', sellPrice: 32000000 },
  ],
};

const shopItems = {
  fashion: [
    // Đồ bình dân (Chợ - CH)
    { id: 'FASHION_CH1', displayId: '#CH1', name: 'Áo thun chợ', price: 50000, brand: 'Chợ', type: 'Áo', tier: 'Bình dân' },
    { id: 'FASHION_CH2', displayId: '#CH2', name: 'Quần jean chợ', price: 100000, brand: 'Chợ', type: 'Quần', tier: 'Bình dân' },
    { id: 'FASHION_CH3', displayId: '#CH3', name: 'Giày dép chợ', price: 80000, brand: 'Chợ', type: 'Giày', tier: 'Bình dân' },
    
    // Local Brand bình dân (Local - LB)
    { id: 'FASHION_LB1', displayId: '#LB1', name: 'Áo thun Yame', price: 200000, brand: 'Yame', type: 'Áo', tier: 'Local Brand' },
    { id: 'FASHION_LB2', displayId: '#LB2', name: 'Quần jean Routine', price: 350000, brand: 'Routine', type: 'Quần', tier: 'Local Brand' },
    { id: 'FASHION_LB3', displayId: '#LB3', name: 'Giày Bitis Hunter', price: 500000, brand: 'Bitis', type: 'Giày', tier: 'Local Brand' },

    // Thương hiệu phổ thông (Basic - BS)
    { id: 'FASHION_BS1', displayId: '#BS1', name: 'Áo Uniqlo', price: 500000, brand: 'Uniqlo', type: 'Áo', tier: 'Phổ thông' },
    { id: 'FASHION_BS2', displayId: '#BS2', name: 'Quần H&M', price: 800000, brand: 'H&M', type: 'Quần', tier: 'Phổ thông' },
    { id: 'FASHION_BS3', displayId: '#BS3', name: 'Giày Adidas Neo', price: 1200000, brand: 'Adidas', type: 'Giày', tier: 'Phổ thông' },

    // Thương hiệu cao cấp (Premium - PR)
    { id: 'FASHION_PR1', displayId: '#PR1', name: 'Áo Polo Lacoste', price: 2500000, brand: 'Lacoste', type: 'Áo', tier: 'Cao cấp' },
    { id: 'FASHION_PR2', displayId: '#PR2', name: 'Quần Versace Jeans', price: 5000000, brand: 'Versace', type: 'Quần', tier: 'Cao cấp' },
    { id: 'FASHION_PR3', displayId: '#PR3', name: 'Giày Nike Air Max', price: 4000000, brand: 'Nike', type: 'Giày', tier: 'Cao cấp' },

    // Thương hiệu luxury (Luxury - LX)
    { id: 'FASHION_LX1', displayId: '#LX1', name: 'Áo Gucci Monogram', price: 15000000, brand: 'Gucci', type: 'Áo', tier: 'Luxury' },
    { id: 'FASHION_LX2', displayId: '#LX2', name: 'Quần Louis Vuitton', price: 20000000, brand: 'Louis Vuitton', type: 'Quần', tier: 'Luxury' },
    { id: 'FASHION_LX3', displayId: '#LX3', name: 'Giày Balenciaga Triple S', price: 25000000, brand: 'Balenciaga', type: 'Giày', tier: 'Luxury' },

    // Phụ kiện bình dân (Accessory Basic - AB)
    { id: 'FASHION_AB1', displayId: '#AB1', name: 'Mũ lưỡi trai local brand', price: 150000, brand: 'Local', type: 'Phụ kiện', tier: 'Bình dân' },
    { id: 'FASHION_AB2', displayId: '#AB2', name: 'Túi đeo chéo Bitis', price: 300000, brand: 'Bitis', type: 'Phụ kiện', tier: 'Bình dân' },
    { id: 'FASHION_AB3', displayId: '#AB3', name: 'Kính mát Uniqlo', price: 400000, brand: 'Uniqlo', type: 'Phụ kiện', tier: 'Bình dân' },

    // Phụ kiện cao cấp (Accessory Premium - AP)
    { id: 'FASHION_AP1', displayId: '#AP1', name: 'Túi Coach', price: 8000000, brand: 'Coach', type: 'Phụ kiện', tier: 'Cao cấp' },
    { id: 'FASHION_AP2', displayId: '#AP2', name: 'Kính Ray-Ban', price: 5000000, brand: 'Ray-Ban', type: 'Phụ kiện', tier: 'Cao cấp' },
    { id: 'FASHION_AP3', displayId: '#AP3', name: 'Nón Gucci', price: 12000000, brand: 'Gucci', type: 'Phụ kiện', tier: 'Cao cấp' },

    // Phụ kiện luxury (Accessory Luxury - AL)
    { id: 'FASHION_AL1', displayId: '#AL1', name: 'Túi Hermes Birkin', price: 500000000, brand: 'Hermes', type: 'Phụ kiện', tier: 'Luxury' },
    { id: 'FASHION_AL2', displayId: '#AL2', name: 'Kính Cartier Diamond', price: 200000000, brand: 'Cartier', type: 'Phụ kiện', tier: 'Luxury' },
    { id: 'FASHION_AL3', displayId: '#AL3', name: 'Đồng hồ Rolex Daytona', price: 1000000000, brand: 'Rolex', type: 'Phụ kiện', tier: 'Luxury' }
  ],
  pets: [
    // Rank C - Thú cưng phổ thông
    { id: 'PET_1', displayId: '#TC1', name: 'Mèo Anh lông ngắn', price: 4000000, type: 'Mèo', food: 'Cá, thức ăn mèo', rarity: 'C' },
    { id: 'PET_2', displayId: '#TC2', name: 'Chó Corgi', price: 8000000, type: 'Chó', food: 'Thức ăn chó, thịt', rarity: 'C' },
    { id: 'PET_3', displayId: '#TC3', name: 'Vẹt Nam Mỹ', price: 5000000, type: 'Chim', food: 'Hạt, trái cây', rarity: 'C' },

    // Rank B - Thú cưng đặc biệt
    { id: 'PET_4', displayId: '#TB1', name: 'Mèo Scottish Fold', price: 15000000, type: 'Mèo', food: 'Cá, thức ăn mèo cao cấp', rarity: 'B' },
    { id: 'PET_5', displayId: '#TB2', name: 'Chó Husky Siberian', price: 20000000, type: 'Chó', food: 'Thức ăn chó cao cấp, thịt', rarity: 'B' },
    { id: 'PET_6', displayId: '#TB3', name: 'Vẹt Macaw Xanh-Vàng', price: 25000000, type: 'Chim', food: 'Hạt cao cấp, trái cây', rarity: 'B' },

    // Rank A - Thú cưng hiếm
    { id: 'PET_7', displayId: '#TA1', name: 'Mèo Sphynx không lông', price: 40000000, type: 'Mèo', food: 'Thực phẩm đặc chế cho mèo Sphynx', rarity: 'A' },
    { id: 'PET_8', displayId: '#TA2', name: 'Chó Poodle Teacup', price: 50000000, type: 'Chó', food: 'Thức ăn cao cấp đặc chế', rarity: 'A' },
    { id: 'PET_9', displayId: '#TA3', name: 'Vẹt African Grey', price: 45000000, type: 'Chim', food: 'Thức ăn nhập khẩu đặc biệt', rarity: 'A' },

    // Rank S - Thú cưng quý hiếm
    { id: 'PET_10', displayId: '#TS1', name: 'Mèo Bengal Exotic', price: 100000000, type: 'Mèo', food: 'Thực phẩm cao cấp đặc chế', rarity: 'S' },
    { id: 'PET_11', displayId: '#TS2', name: 'Chó Samoyed Trắng Tinh', price: 120000000, type: 'Chó', food: 'Thức ăn cao cấp nhập khẩu', rarity: 'S' },
    { id: 'PET_12', displayId: '#TS3', name: 'Vẹt Hyacinth Macaw', price: 150000000, type: 'Chim', food: 'Thức ăn đặc chế cao cấp', rarity: 'S' },

    // Rank SS - Thú cưng cực hiếm
    { id: 'PET_13', displayId: '#TSS1', name: 'Mèo Maine Coon Khổng Lồ', price: 200000000, type: 'Mèo', food: 'Thực phẩm siêu cao cấp đặc chế', rarity: 'SS' },
    { id: 'PET_14', displayId: '#TSS2', name: 'Chó Alaskan Malamute Thuần Chủng', price: 250000000, type: 'Chó', food: 'Thức ăn siêu cao cấp đặc chế', rarity: 'SS' },
    { id: 'PET_15', displayId: '#TSS3', name: 'Vẹt Scarlet Macaw Đột Biến', price: 300000000, type: 'Chim', food: 'Thức ăn siêu cao cấp nhập khẩu', rarity: 'SS' },

    // Rank SSS - Thú cưng siêu hiếm
    { id: 'PET_16', displayId: '#TSSS1', name: 'Mèo Savannah F1', price: 400000000, type: 'Mèo', food: 'Thực phẩm siêu cao cấp nhập khẩu', rarity: 'SSS' },
    { id: 'PET_17', displayId: '#TSSS2', name: 'Chó Tibetan Mastiff Thuần Chủng', price: 500000000, type: 'Chó', food: 'Thức ăn siêu cao cấp nhập khẩu', rarity: 'SSS' },
    { id: 'PET_18', displayId: '#TSSS3', name: 'Vẹt Palm Cockatoo Đột Biến', price: 550000000, type: 'Chim', food: 'Thức ăn siêu cao cấp đặc biệt', rarity: 'SSS' },

    // Rank SSS+ - Thú cưng huyền thoại
    { id: 'PET_19', displayId: '#TSSS+1', name: 'Mèo Ashera Lai Đặc Biệt', price: 800000000, type: 'Mèo', food: 'Thực phẩm huyền thoại đặc chế', rarity: 'SSS+' },
    { id: 'PET_20', displayId: '#TSSS+2', name: 'Chó Tibetan Mastiff Bạch Tạng', price: 900000000, type: 'Chó', food: 'Thức ăn huyền thoại đặc chế', rarity: 'SSS+' },
    { id: 'PET_21', displayId: '#TSSS+3', name: 'Vẹt Spix Macaw Đột Biến', price: 1000000000, type: 'Chim', food: 'Thức ăn huyền thoại đặc biệt', rarity: 'SSS+' }
  ],
  vehicles: [
    // Phương tiện cơ bản
    { id: 'VEHICLE_1', displayId: '#CB1', name: 'Xe đạp', price: 2500000, type: 'Xe đạp', fuel: 'Không cần', tier: 'Cơ bản' },
    { id: 'VEHICLE_2', displayId: '#CB2', name: 'Xe máy 50cc', price: 7500000, type: 'Xe máy', fuel: 'Xăng', tier: 'Cơ bản' },
    { id: 'VEHICLE_3', displayId: '#CB3', name: 'Xe máy PCX', price: 15000000, type: 'Xe máy', fuel: 'Xăng', tier: 'Cơ bản' },

    // Xe điện cao cấp
    { id: 'VEHICLE_4', displayId: '#XD1', name: 'Xe hơi Vinfast VF5', price: 1000000000, type: 'Ô tô', fuel: 'Điện', tier: 'Cao cấp' },
    { id: 'VEHICLE_5', displayId: '#XD2', name: 'Xe hơi Vinfast VF8', price: 2000000000, type: 'Ô tô', fuel: 'Điện', tier: 'Cao cấp' },

    // Xe xăng cao cấp
    { id: 'VEHICLE_6', displayId: '#XX1', name: 'Mercedes C300', price: 3000000000, type: 'Ô tô', fuel: 'Xăng', tier: 'Cao cấp' },
    { id: 'VEHICLE_7', displayId: '#XX2', name: 'BMW 7 Series', price: 5000000000, type: 'Ô tô', fuel: 'Xăng', tier: 'Cao cấp' },

    // Phương tiện đặc biệt
    { id: 'VEHICLE_8', displayId: '#DB1', name: 'Du thuyền Sea Ray', price: 10000000000, type: 'Thuyền', fuel: 'Dầu', tier: 'Đặc biệt' },
    { id: 'VEHICLE_9', displayId: '#DB2', name: 'Máy bay riêng Cessna', price: 50000000000, type: 'Máy bay', fuel: 'Nhiên liệu máy bay', tier: 'Đặc biệt' }
  ]
};

module.exports = {
  rareItems,
  shopItems
};