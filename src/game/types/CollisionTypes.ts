// src/types/CollisionTypes.ts

import RAPIER from "@dimforge/rapier2d-deterministic-compat";
import { BaseEntity } from "../models/core/BaseEntity";


export interface CollisionContext {
  // this
  sourceEntity: BaseEntity;
  targetEntity: BaseEntity;
  sourceCollider: RAPIER.Collider;
  targetCollider: RAPIER.Collider;
}