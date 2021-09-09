import { PriorityLevels } from "../../../lib/PriorityLevels";
import { ModelData } from "../../../types/ModelData";
import { _modelKey } from "../../Model";
import { PropertyDecoratorWrapper } from "../../PropertyDecorator";

export function ManyToMany<T extends Function>(
  getTargetModel: () => T,
  inverseRelation:
    | ((data: Record<keyof T["prototype"], number>) => number)
    | string
): PropertyDecorator {
  return (target, propKey) => {
    const propName = String(propKey);

    let TargetModel: Function, targetModelData: ModelData;

    PropertyDecoratorWrapper(
      target.constructor,
      PriorityLevels.autoProperties,
      (data) => {
        TargetModel = getTargetModel();
        targetModelData =
          TargetModel &&
          (Reflect.getMetadata(_modelKey, TargetModel) as ModelData);

        if (!data.properties.has(propName)) {
          data.properties.set(propName, {
            name: propName,
            type: targetModelData.name + "[]",
            nullable: false,
            attributes: [],
          });
        }
      }
    );

    PropertyDecoratorWrapper(
      target.constructor,
      PriorityLevels.relation,
      (data) => {
        const TargetModel = getTargetModel();
        const targetModelData =
          TargetModel &&
          (Reflect.getMetadata(_modelKey, TargetModel) as ModelData);

        let thisProperty = data.properties.get(propName);

        if (!targetModelData) {
          throw new TypeError(
            `Target model of OneToOne relation ${target.constructor.name}.${propName} is not a valid model`
          );
        }

        let inverseFieldName: string = inverseRelation as any;

        if (typeof inverseRelation !== "string") {
          const keys = [...targetModelData.properties.keys()];
          const fakeData: any = {};

          for (let i = 0; i < keys.length; i++) fakeData[keys[i]] = i;

          inverseFieldName = keys[inverseRelation(fakeData)];
        }

        const inverseProperty =
          targetModelData.properties.get(inverseFieldName);

        if (!inverseProperty) throw new Error("Invalid inverse property");

        const inverseRelationAttr = inverseProperty.attributes.find(
          (x) => x.name === "relation"
        );
        if (inverseRelationAttr) {
          thisProperty.attributes.push(inverseRelationAttr);

          return;
        }

        thisProperty.attributes.push({
          name: "relation",
          args: [`${data.name}_${propName}`],
        });
      }
    );
  };
}
