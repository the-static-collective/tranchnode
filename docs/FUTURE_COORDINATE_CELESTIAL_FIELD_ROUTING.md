# Future Coordinate — Celestial Field Routing

Status: **future coordinate / non-canonical / no implementation commitment**

Parent coordinate: `docs/FUTURE_COORDINATE_LUMINOUS_COMPUTATIONAL_TERRAIN.md`

Grounding thread: `the-static-collective/national-treasure/threads/intentional-solar-field-routing.md`

## Coordinate

> **A future building may participate in a natural light field not only by sensing it or converting it, but by intentionally transforming and handing it onward.**

The shorthand image is a mirror maze in a pyramid:

```text
SUN
 ↓
Building A
  reflect / split / filter
        ↘
         Building B
            refract / guide / absorb
                 ↘
                  civic surface / interior / local node
```

The important architectural claim is not that sunlight should bounce forever. It is that the built world can contain declared, bounded optical transitions in which each body is an attributable participant in the path.

## 1. From sensor input to routed physical field

A weak interpretation of the celestial field is:

```text
sunlight
  ↓
sensor
  ↓
data
```

This coordinate preserves the stronger possibility:

```text
sunlight
  ↓
receiving body
  ↓
physical transform
  ├─ reflection
  ├─ refraction
  ├─ spectral split
  ├─ concentration
  ├─ diffusion
  ├─ guidance
  ├─ conversion
  └─ rejection
  ↓
next encounter
```

The building can still measure the field, but measurement is only one consequence among several.

## 2. The Sun as external energy and information field

The Sun is neither a local node nor a message sender in the ordinary systems sense.

For this coordinate it is better treated as an external physical field whose current state affects local possibilities:

- available optical energy;
- solar angle;
- spectrum;
- shadow geometry;
- thermal loading;
- daylight availability;
- timing relation;
- weather-mediated attenuation.

A building may then decide locally how to admit, reject, redirect, split, store, convert, or pass on part of that field.

This means the city does not manufacture all of its meaningful inputs. It remains physically coupled to the larger world in which it exists.

## 3. Building as optical junction

A building node can be extended from:

```text
structure + compute + sensing + communication
```

to:

```text
structure
  + local compute
  + sensing
  + communication
  + field reception
  + field transformation
  + bounded optical outputs
  ↓
EMBODIED OPTICAL JUNCTION
```

Candidate components include ordinary mirrors, glazing, light shelves, louvers, prisms, lenses, light pipes, fiber, spectral filters, adaptive façades, tracking surfaces, and future optical materials.

The node need not use all of them. The coordinate only preserves the architectural category.

## 4. The city as a mirror maze — sharpened

"Mirror maze" should mean a network of explicit physical transformations, not uncontrolled beam bouncing.

A city-scale path might look like:

```text
solar field
   ↓
roof collector A
   ├─ branch 1 → local PV / thermal conversion
   ├─ branch 2 → interior daylight
   └─ branch 3 → bounded reflected path
                         ↓
                     façade B
                      split / guide
                         ↓
                     civic node C
                      absorb / use
```

Each branch has an energy cost, a safety envelope, and a transformation history.

The useful primitive is therefore:

> **receiver → transformer → next source condition**

A node can become the immediate source condition for the next encounter without becoming the energetic origin of the field.

## 5. Celestial field in the transition law

The parent coordinate used:

\[
X_{n+1} = T(X_n, E_n, I_n) + \Delta_n
\]

This extension makes the external field explicit when it matters:

\[
X_{n+1} = T(X_n, E_n, I_n, C_n) + \Delta_n
\]

where `C_n` is a declared celestial / environmental field observation such as:

```text
solar irradiance
solar geometry
available optical band
lunar illumination
sky condition
weather attenuation
```

`C_n` is not privileged truth. It is another bounded input to the local transition.

## 6. Energy and information co-travel without becoming the same thing

The same solar field may participate in:

- illumination;
- photovoltaic conversion;
- thermal capture or rejection;
- timing / geometry observation;
- sensing;
- optical signaling;
- calibration;
- downstream routing.

But routing information does not erase energy accounting.

If one optical branch is absorbed, filtered, converted, scattered, or redirected, the remaining branches change.

A future field-routing system should therefore preserve an explicit physical budget rather than treating photons as costless messages.

## 7. Coherence boundary

The mirror-maze coordinate must not silently merge ordinary sunlight with coherent structured light.

Direct sunlight at the building scale is not automatically a phase-stable laser source. Holography, phase-sensitive wavefront shaping, cavity recurrence, and other coherent-light mechanisms from the parent research thread require different conditions.

If a later system needs coherence, a lawful architecture may instead:

```text
solar field
   ↓
harvest / convert
   ↓
local energy store / electrical system
   ↓
coherent emitter
```

or use another bounded optical-conditioning stage.

Therefore:

> **natural solar routing and coherent optical recursion may meet in one architecture, but one does not imply the other.**

## 8. Moonlight

Moonlight can enter the same geometric grammar of receiving, reflecting, refracting, filtering, and observing.

It should not be treated as equivalent to direct sunlight in usable power.

For this coordinate:

```text
Sun  = major external energy + information field
Moon = weak reflected optical field + geometry / timing / environmental information
```

The difference is part of the model, not a nuisance to normalize away.

## 9. Field-routing receipt

A future TranchNode-compatible receipt might preserve:

```yaml
field_routing_event:
  origin_class: solar | lunar | artificial | mixed | unknown
  receiving_body_ref: "..."
  incident_field_ref: "..."
  transform_chain:
    - reflection
    - spectral_split
    - light_guide
  output_branches:
    - destination_ref: "..."
      purpose: "..."
      measured_or_estimated_energy_fraction: "..."
  safety_constraints_ref: "..."
  environment_snapshot_ref: "..."
  downstream_receipt_refs: []
  unresolved_loss: "..."
  uncertainty: "..."
```

This preserves a crucial lineage distinction:

> **the transition road matters more than visual resemblance.**

A bright patch at Building B does not prove it descended from Building A unless the path is attributable.

## 10. Safety and ordinary-world priority

Any later specimen inherits hard boundaries:

1. **No uncontrolled concentrated beam paths through occupied public space.**
2. **Eye, glare, heat, fire, traffic, aviation, neighboring-property, and material-safety constraints outrank optical cleverness.**
3. **Mechanical and architectural safety remain valid without the optical layer.**
4. **Loss of tracking, networking, or computation must fail toward safe passive behavior.**
5. **A surface's ability to receive or redirect light grants no authority over people.**
6. **A reflected path is not a communication entitlement; downstream nodes may refuse or ignore it.**
7. **Weather and darkness are ordinary operating states, not exceptional failures.**

## 11. First eventual specimen

Do not begin with two buildings across a street.

Begin with one tabletop or room-scale optical topology:

```text
artificial sun / safe broad source
        ↓
tracking mirror A
        ↓
filter / splitter B
      ↙         ↘
 detector C    light guide D
```

Preserve deterministic configuration receipts and test:

1. Can a known input field be routed through multiple declared transforms?
2. Can each output branch be attributed to the transform chain?
3. Can energy loss be estimated rather than ignored?
4. Can one branch change without pretending the others are unchanged?
5. Can the system fail safe when tracking or control disappears?
6. Can the same grammar later accept natural sunlight without rewriting the lineage model?

Only after that would inter-building routing deserve serious physical consideration.

## Coordinate statement

> **Future luminous infrastructure may be organized as a bounded mirror maze embedded in the real world: natural fields arrive from outside the system, local bodies receive and transform them, each transformation remains attributable, and no participating body becomes sovereign merely because it can redirect what passes through it.**

The whole city may someday participate in the maze.

The Sun is still the Sun.
