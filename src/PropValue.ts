import { PropValueType, Vec3D, Vec3, Quat, AcceptedPropertyTypes, EnumValue, Enum } from "./DataTypes";

/**
 * Property value wrapper
 */
export class PropValue {
    private value: AcceptedPropertyTypes;
    private type: PropValueType;
    private customType: number; 
    constructor(value?: AcceptedPropertyTypes, type?: PropValueType, customType?: number) {
        this.value = value;
        this.customType = customType || 0;
        this.type = type || PropValueType.NOTHING;
    }
    isCustomType(): number {
        return this.customType;
    }
    set(value: AcceptedPropertyTypes, type: PropValueType): void {  
        this.value = value;
        this.type = type;
    }
    toString(): string {
        switch (this.type) {
            case PropValueType.BOOLEAN:
                return `Boolean(${this.value})`;
            case PropValueType.INT:
                return `Int(${this.value})`;
            case PropValueType.FLOAT:
                return `Float(${this.value})`;
            case PropValueType.DOUBLE:
                return `Double(${this.value})`;
            case PropValueType.STRING:
                return `String(${this.value})`;
            case PropValueType.BYTEARR:
                return `ByteArray(${(this.value as Uint8Array).length} bytes)`;
            case PropValueType.CUSTOM_TYPE:
                return `CustomType(${(this.value as Uint8Array).length} bytes)`;
            case PropValueType.VEC3D:
                return this.value.toString();
            case PropValueType.VEC3:
                return this.value.toString();
            case PropValueType.QUAT:
                return this.value.toString();
            case PropValueType.ENUM_TYPE:
                return `Enum(${this.value})`;
            default:
                return `Nothing`;
        }
    }
    isSame(other: PropValue, eps: number = 1E-6): boolean {
        if (this.type !== other.type) {
            return false;
        }
        switch (this.type) {
            case PropValueType.BOOLEAN:
                return this.value === other.value;
            case PropValueType.INT:
            case PropValueType.FLOAT:
            case PropValueType.DOUBLE:
                return Math.abs((this.value as number) - (other.value as number)) < eps;
            case PropValueType.STRING:
                return this.value === other.value;
            case PropValueType.BYTEARR:
            case PropValueType.CUSTOM_TYPE:
                let thisArr = this.value as Uint8Array;
                let otherArr = other.value as Uint8Array;
                if (thisArr.length !== otherArr.length) {
                    return false;
                }
                for (let i = 0; i < thisArr.length; i++) {
                    if (thisArr[i] != otherArr[i]) {
                        return false;
                    }
                }
                return true;
            case PropValueType.VEC3D:
                return (this.value as Vec3D).isSame(other.value as Vec3D, eps);
            case PropValueType.VEC3:
                return (this.value as Vec3).isSame(other.value as Vec3, eps);
            case PropValueType.QUAT:
                return (this.value as Quat).isSame(other.value as Quat, eps);
            case PropValueType.ENUM_TYPE:
                return (this.value as EnumValue).enumId === (other.value as EnumValue).enumId &&
                       (this.value as EnumValue).currValue === (other.value as EnumValue).currValue;
            default:
                return true; // NOTHING
        }
    }
    get<T>(): T {
        return this.value as unknown as T;
    }

    getValue(): any {
        return this.value;
    }

    getType(): PropValueType {
        return this.type;
    }
    static getDefault(type: PropValueType): PropValue {
        switch (type) {
            case PropValueType.BOOLEAN:
                return new PropValue(false, PropValueType.BOOLEAN);
            case PropValueType.INT:
                return new PropValue(0, PropValueType.INT);
            case PropValueType.FLOAT:
                return new PropValue(0.0, PropValueType.FLOAT);
            case PropValueType.DOUBLE:
                return new PropValue(0.0, PropValueType.DOUBLE);
            case PropValueType.STRING:
                return new PropValue("", PropValueType.STRING);
            case PropValueType.BYTEARR:
                return new PropValue(new Uint8Array(), PropValueType.BYTEARR);
            case PropValueType.VEC3D:
                return new PropValue(new Vec3D(), PropValueType.VEC3D);
            case PropValueType.VEC3:
                return new PropValue(new Vec3(), PropValueType.VEC3);
            case PropValueType.QUAT:
                return new PropValue(new Quat(), PropValueType.QUAT);
            case PropValueType.ENUM_TYPE:
                return new PropValue({ enumId: 0, currValue: 0 }, PropValueType.ENUM_TYPE);
            default:
                return new PropValue(undefined, PropValueType.NOTHING);
        }
    }
}
