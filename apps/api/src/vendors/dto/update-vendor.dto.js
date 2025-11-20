"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateVendorDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const create_vendor_dto_1 = require("./create-vendor.dto");
class UpdateVendorDto extends (0, swagger_1.PartialType)(create_vendor_dto_1.CreateVendorDto) {
}
exports.UpdateVendorDto = UpdateVendorDto;
//# sourceMappingURL=update-vendor.dto.js.map