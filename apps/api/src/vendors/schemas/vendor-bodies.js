"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VENDOR_BODIES = void 0;
const create_vendor_dto_1 = require("../dto/create-vendor.dto");
const update_vendor_dto_1 = require("../dto/update-vendor.dto");
exports.VENDOR_BODIES = {
    createVendor: {
        description: 'Vendor creation data',
        type: create_vendor_dto_1.CreateVendorDto,
    },
    updateVendor: {
        description: 'Vendor update data',
        type: update_vendor_dto_1.UpdateVendorDto,
    },
};
//# sourceMappingURL=vendor-bodies.js.map