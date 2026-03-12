import { ADDITIONAL_WIKI_DATA, EXERCISE_ENHANCEMENTS } from "./wikiEnhancements";

export type ExerciseEquipment =
    | "barbell"
    | "dumbbell"
    | "kettlebell"
    | "bench"
    | "bodyweight"
    | "band"
    | "machine"
    | "cable"
    | "smith-machine"
    | "landmine"
    | "pull-up-bar";

export interface ExerciseWiki {
    id: string;
    name: string;
    category: "Push" | "Pull" | "Legs" | "Core" | "Cardio/Mobility";
    muscles: {
        primary: string[];
        secondary: string[];
    };
    biomechanics: string;
    cues: string[];
    commonMistakes: string[];
    alternatives: string[];
    notes: string;
    youtubeId?: string;
    equipment?: ExerciseEquipment[];
    difficulty?: "Beginner" | "Intermediate" | "Advanced";
    movementPattern?: string;
    bestFor?: string[];
    setupChecklist?: string[];
    freeWeightAlternatives?: string[];
    minimalEquipmentAlternatives?: string[];
    homeGymFriendly?: boolean;
}

const BASE_WIKI_DATA: ExerciseWiki[] = [
    // ═══════════════════════════════════════
    // PUSH EXERCISES
    // ═══════════════════════════════════════
    {
        id: "e-bench-press",
        name: "Bench Press",
        category: "Push",
        muscles: {
            primary: ["Pectoralis Major (Sternal)"],
            secondary: ["Anterior Deltoids", "Triceps Brachii", "Serratus Anterior"],
        },
        youtubeId: "rxD321l2svE",
        biomechanics:
            "A horizontal pressing movement that primarily loads the sternal head of the pec major through shoulder horizontal adduction and elbow extension. The flat angle biases the mid-chest. Grip width determines elbow flare and tricep involvement — wider grips increase pec stretch but also shoulder stress.",
        cues: [
            "Retract and depress scapula — pinch shoulder blades together and pull them down into the bench.",
            "Grip the bar so your forearms are vertical when the bar touches your chest.",
            "Drive through your heels to generate leg drive and maintain an arch.",
            "Touch the bar to your lower sternum, not at the collarbones.",
            "Press in a slight J-curve back toward the rack, not straight up.",
        ],
        commonMistakes: [
            "Flaring elbows to 90° — increases shoulder impingement risk. Keep elbows at ~45-75°.",
            "Bouncing the bar off the chest — eliminates the hardest part of the ROM and risks sternum injury.",
            "Losing upper back tightness during the press — scapulae must stay retracted the entire set.",
            "Lifting hips off the bench to move more weight — reduces chest activation.",
        ],
        alternatives: ["Dumbbell Bench Press", "Machine Chest Press", "Floor Press"],
        notes:
            "For recomp, the bench is your primary strength marker for pushing. Aim for progressive overload in the 6-8 rep range on Day 1 (Heavy Push). If you stall, try adding a single rep before adding weight. A 2.5kg micro-load increase per week is ideal.",
    },
    {
        id: "e-seated-db-press",
        name: "Seated DB Press",
        category: "Push",
        muscles: {
            primary: ["Anterior Deltoids"],
            secondary: ["Lateral Deltoids", "Triceps Brachii", "Upper Trapezius"],
        },
        youtubeId: "HzIiNhHhhtA",
        biomechanics:
            "A vertical pressing pattern that primarily targets the anterior deltoid via shoulder flexion and abduction with elbow extension. Using dumbbells allows a greater range of motion compared to a barbell and permits a more natural pressing arc, reducing shoulder impingement risk for many lifters.",
        cues: [
            "Set the bench to 75-85°, not perfectly vertical — better shoulder mechanics.",
            "Start with dumbbells at ear height, palms facing forward.",
            "Press up and slightly inward so the dumbbells nearly touch at lockout.",
            "Control the eccentric — 2-3 seconds on the way down.",
        ],
        commonMistakes: [
            "Flaring elbows straight out to the sides — tuck them ~30° forward.",
            "Excessive arching of the lower back to compensate for weak shoulders.",
            "Using momentum / kipping on the last reps.",
            "Setting bench at exactly 90° — can cause neck compression and impingement.",
        ],
        alternatives: ["Barbell OHP", "Machine Shoulder Press", "Landmine Press"],
        notes:
            "This is your secondary push on Heavy Push day. The dumbbells allow independent arm work, helping correct strength imbalances. If one side is weaker, always start with that side and match reps on the other.",
    },
    {
        id: "e-incline-db-press",
        name: "Incline DB Press",
        category: "Push",
        muscles: {
            primary: ["Pectoralis Major (Clavicular / Upper Chest)"],
            secondary: ["Anterior Deltoids", "Triceps Brachii"],
        },
        youtubeId: "8iPEnn-ltC8",
        biomechanics:
            "An inclined pressing angle (30-45°) shifts mechanical tension from the sternal pecs to the clavicular head (upper chest). The steeper the incline, the more deltoid-dominant it becomes. 30° is the sweet spot for upper chest bias.",
        cues: [
            "Set the bench to 30-45° incline.",
            "Lower dumbbells to the upper chest line / collar bone area.",
            "Press at a slight inward arc, squeezing the upper chest at the top.",
            "Keep shoulder blades retracted.",
        ],
        commonMistakes: [
            "Setting incline too steep (60°+) — turns it into a shoulder press.",
            "Letting the dumbbells drift too far down toward the belly.",
            "Losing scapular retraction as fatigue sets in.",
        ],
        alternatives: ["Incline Barbell Press", "Low-to-High Cable Flyes", "Svend Press"],
        notes:
            "Upper chest development is critical for a full, aesthetic chest. This exercise fills the gap between your flat bench and overhead pressing.",
    },
    {
        id: "e-cable-lateral-raises",
        name: "Cable Lateral Raises",
        category: "Push",
        muscles: {
            primary: ["Lateral Deltoids"],
            secondary: ["Upper Trapezius", "Supraspinatus"],
        },
        youtubeId: "PPrzBWZDOhA",
        biomechanics:
            "Shoulder abduction in the scapular plane, isolating the lateral (side) deltoids. Cables maintain constant tension throughout the entire ROM, unlike dumbbells which lose tension at the bottom. This makes cables superior for lateral delt hypertrophy.",
        cues: [
            "Use a behind-the-body cable path or cross-body for constant tension.",
            "Lead with the elbow, not the hand — imagine pouring a pitcher of water at the top.",
            "Raise to roughly ear height, slightly above shoulder height for full lateral delt activation.",
            "Control the negative — don't let the cable snap you back down.",
        ],
        commonMistakes: [
            "Using too much weight and compensating with body English / traps.",
            "Shrugging up instead of abducting outward.",
            "Internal rotation at the top — don't 'pour water'. Keep thumb neutral or slightly up for healthier shoulders.",
        ],
        alternatives: ["Dumbbell Lateral Raises", "Machine Lateral Raises", "Lean-Away Laterals"],
        notes:
            "Lateral deltoid width is one of the most impactful changes for an aesthetic physique. 4 sets with higher reps (12-15) creates the metabolic stress needed for growth. Prioritize mind-muscle connection over weight.",
    },
    {
        id: "e-tricep-pushdowns",
        name: "Tricep Pushdowns",
        category: "Push",
        muscles: {
            primary: ["Triceps Brachii (Lateral & Medial Heads)"],
            secondary: ["Anconeus"],
        },
        youtubeId: "2-LAMcpzODU",
        biomechanics:
            "An elbow extension exercise. Because the shoulder is adducted (arm at your side), the long head of the triceps is slackened, meaning pushdowns primarily target the lateral and medial heads. Use an overhead extension to target the long head.",
        cues: [
            "Keep elbows pinned to your sides — they should not drift forward or backward.",
            "Fully extend at the bottom and squeeze the triceps hard.",
            "Use a controlled tempo, ~2 seconds on the eccentric.",
            "Lean slightly forward for a better line of resistance.",
        ],
        commonMistakes: [
            "Letting elbows flare forward — turns it into a pressing motion with shoulders.",
            "Using body weight to push the cable down (leaning in too much).",
            "Cutting ROM short at the bottom — full extension is key.",
        ],
        alternatives: ["Overhead Tricep Extension", "Skull Crushers", "Diamond Push-ups"],
        notes:
            "Triceps make up approximately 2/3 of your arm. Pushdowns are a joint-friendly staple. For maximum arm development, pair with an overhead extension movement that targets the long head.",
    },
    {
        id: "e-incline-barbell-press",
        name: "Incline Barbell Press",
        category: "Push",
        muscles: {
            primary: ["Pectoralis Major (Clavicular)", "Anterior Deltoids"],
            secondary: ["Triceps Brachii", "Serratus Anterior"],
        },
        youtubeId: "SrqOu55lrIU",
        biomechanics:
            "Same principle as incline DB press but with a barbell, allowing heavier loading. The fixed bar path limits the range of motion slightly but allows for greater absolute weight, making it an excellent strength-hypertrophy bridge for the upper chest.",
        cues: [
            "Grip slightly wider than shoulder width.",
            "Lower to the upper chest / clavicle line.",
            "Maintain scapular retraction throughout.",
            "Drive the bar up and slightly back toward the rack.",
        ],
        commonMistakes: [
            "Bench angle too steep — keep it at 30-45°.",
            "Lowering bar to the mid-chest instead of upper chest.",
            "Losing arch and tightness as fatigue builds.",
        ],
        alternatives: ["Incline DB Press", "Smith Machine Incline Press", "Low Cable Flyes"],
        notes:
            "This is your primary push on Hyper Push day. The slightly higher rep range (3x8-10) compared to flat bench allows you to accumulate volume for the upper chest without excessive CNS fatigue.",
    },
    {
        id: "e-pec-deck",
        name: "Pec Deck",
        category: "Push",
        muscles: {
            primary: ["Pectoralis Major (Sternal & Clavicular)"],
            secondary: ["Anterior Deltoids"],
        },
        youtubeId: "O-aQoOP6vAE",
        biomechanics:
            "An isolation movement for horizontal adduction of the shoulder. The machine stabilizes the movement, removing the need for stabilizer muscles and placing all tension directly on the pecs. Excellent for achieving a deep stretch at the open position and a peak contraction when arms are brought together.",
        cues: [
            "Adjust the seat so handles are at chest height.",
            "Keep a slight bend in the elbows throughout.",
            "Squeeze the pecs hard at the closed position, holding for 1 second.",
            "Allow a deep, controlled stretch on the negative.",
        ],
        commonMistakes: [
            "Setting the starting position too far back — overstretching the shoulder capsule.",
            "Using momentum to slam the pads together.",
            "Hunching the shoulders forward instead of keeping the chest up.",
        ],
        alternatives: ["Cable Flyes", "Dumbbell Flyes", "Machine Chest Press (narrow grip)"],
        notes:
            "The pec deck is one of the best chest isolation movements because the resistance curve perfectly matches the pec's strength curve. 3x12-15 on Hyper Push day creates maximal metabolic stress in the pecs.",
    },
    {
        id: "e-arnold-press",
        name: "Arnold Press",
        category: "Push",
        muscles: {
            primary: ["Anterior Deltoids", "Lateral Deltoids"],
            secondary: ["Triceps Brachii", "Upper Trapezius"],
        },
        youtubeId: "6Z15_WdXmVw",
        biomechanics:
            "A rotational pressing variant invented by Arnold Schwarzenegger. The rotation from a supinated grip (palms facing you) to a pronated grip at the top increases time under tension for the anterior and lateral deltoids, hitting a greater portion of the deltoid than a standard press.",
        cues: [
            "Start with dumbbells at chin height, palms facing you.",
            "Rotate palms outward as you press up — the rotation and press happen simultaneously.",
            "At the top, palms should face forward with arms fully extended.",
            "Reverse the motion on the way down.",
        ],
        commonMistakes: [
            "Rushing the rotation — the magic is in the slow, controlled rotation.",
            "Using too heavy a weight — this is a finesse movement, not a strength one.",
            "Not completing the full rotation arc.",
        ],
        alternatives: ["Seated DB Press", "Machine Shoulder Press", "Barbell OHP"],
        notes:
            "The Arnold Press is unmatched for total delt activation in a single movement. Use it on Hyper Push day to maximize shoulder muscle fiber recruitment.",
    },
    {
        id: "e-lateral-raises",
        name: "Lateral Raises",
        category: "Push",
        muscles: {
            primary: ["Lateral Deltoids"],
            secondary: ["Upper Trapezius", "Supraspinatus"],
        },
        youtubeId: "3VcKaXpzqRo",
        biomechanics:
            "Dumbbell shoulder abduction. Unlike cables, dumbbells provide peak tension at the top of the range of motion when the moment arm is longest. The bottom portion has minimal tension due to gravity's direction.",
        cues: [
            "Slight bend in elbows, locked throughout the movement.",
            "Raise to shoulder height — no higher needed.",
            "Initiate the lift from the delts, not by shrugging.",
            "Keep pinkies slightly higher than thumbs for lateral delt emphasis (but don't force internal rotation).",
        ],
        commonMistakes: [
            "Using too much weight — ego-lifting laterals is pointless.",
            "Shrugging the weight up with traps.",
            "Swinging the torso for momentum.",
        ],
        alternatives: ["Cable Lateral Raises", "Machine Lateral Raises", "Band Lateral Raises"],
        notes:
            "4x15 with strict form will build capped delts. If you can't lift the weight without swinging, it's too heavy. The lateral delt responds extremely well to high rep, high volume training.",
    },
    {
        id: "e-skullcrushers",
        name: "Skullcrushers",
        category: "Push",
        muscles: {
            primary: ["Triceps Brachii (Long Head)"],
            secondary: ["Medial Head", "Lateral Head", "Anconeus"],
        },
        youtubeId: "d_KZxkY_0cM",
        biomechanics:
            "An overhead extension pattern performed lying down. The shoulder is flexed (arms overhead at an angle), which puts the long head on a stretch. This makes skullcrushers one of the best exercises for the long head of the triceps, which is the biggest head and contributes most to arm size.",
        cues: [
            "Lower the EZ bar behind your head (not to the forehead — despite the name) for maximal long head stretch.",
            "Keep upper arms slightly angled back, not vertical. This maintains tension at the top.",
            "Extend using only the elbows.",
            "Use a controlled 3-second eccentric.",
        ],
        commonMistakes: [
            "Lowering to the forehead instead of behind the head — limits ROM and long head stretch.",
            "Flaring elbows out wide.",
            "Using too much weight and relying on momentum.",
        ],
        alternatives: ["Overhead Cable Extension", "French Press", "JM Press"],
        notes:
            "If you only do one tricep exercise, it should involve an overhead component to hit the long head. Skullcrushers + pushdowns is the ultimate tricep combo for recomp.",
    },

    // ═══════════════════════════════════════
    // PULL EXERCISES
    // ═══════════════════════════════════════
    {
        id: "e-barbell-rows",
        name: "Barbell Rows",
        category: "Pull",
        muscles: {
            primary: ["Latissimus Dorsi", "Rhomboids", "Middle Trapezius"],
            secondary: ["Biceps Brachii", "Posterior Deltoids", "Erector Spinae"],
        },
        youtubeId: "I00-7B-8zDk",
        biomechanics:
            "A horizontal pulling movement involving shoulder extension and scapular retraction. The bent-over position requires significant isometric strength from the erectors and core. Grip width and torso angle determine which muscles are emphasized — more upright targets upper back, more horizontal targets lats.",
        cues: [
            "Hinge at the hips until your torso is 15-45° above horizontal.",
            "Pull the bar toward your belly button / lower ribs.",
            "Lead with elbows and squeeze shoulder blades together at the top.",
            "Keep your spine neutral throughout — brace your core.",
        ],
        commonMistakes: [
            "Jerking the weight up with momentum (excessive hip extension).",
            "Rounding the lower back — this is a recipe for disc issues.",
            "Standing too upright, turning it into an upright row / shrug.",
            "Pulling to the chest instead of the waist — shifts to upper traps.",
        ],
        alternatives: ["Chest-Supported Row", "Seated Cable Row", "T-Bar Row"],
        notes:
            "Barbell rows are your primary back strength builder on Heavy Pull day. Focus on a controlled eccentric and a hard squeeze at the top. If your lower back fatigues before your lats, consider chest-supported rows as an alternative.",
    },
    {
        id: "e-pullups",
        name: "Pull-ups",
        category: "Pull",
        muscles: {
            primary: ["Latissimus Dorsi"],
            secondary: ["Biceps Brachii", "Teres Major", "Lower Trapezius", "Infraspinatus"],
        },
        youtubeId: "eGo4IYPNi4",
        biomechanics:
            "A vertical pulling movement — arguably the king of back exercises. Involves shoulder adduction and extension with elbow flexion. Pull-ups require you to move your entire body weight, making them an excellent relative strength indicator. Wider grip emphasizes lats; closer grip increases bicep involvement.",
        cues: [
            "Initiate the pull by depressing and retracting your scapulae ('put your shoulder blades in your back pockets').",
            "Pull your chest to the bar, not just your chin over it.",
            "Fully extend at the bottom — dead hang for a full stretch.",
            "Avoid excessive kipping or swinging.",
        ],
        commonMistakes: [
            "Half-repping — not going to full extension at the bottom.",
            "Using only arms (bicep dominant) instead of initiating with the back.",
            "Kipping / swinging for reps.",
            "Craning neck over the bar instead of actually pulling high enough.",
        ],
        alternatives: ["Lat Pulldowns", "Assisted Pull-up Machine", "Band-Assisted Pull-ups"],
        notes:
            "If you can't do 3x8 bodyweight pull-ups, use a band or the assisted pull-up machine until you build the strength. If you can do 3x10+ easily, add weight via a dip belt. Pull-ups are non-negotiable for a big, wide back.",
    },
    {
        id: "e-seated-cable-rows",
        name: "Seated Cable Rows",
        category: "Pull",
        muscles: {
            primary: ["Rhomboids", "Middle Trapezius", "Latissimus Dorsi"],
            secondary: ["Biceps Brachii", "Posterior Deltoids", "Erector Spinae"],
        },
        youtubeId: "GZbfZ033f74",
        biomechanics:
            "A seated horizontal pull with constant cable tension. The fixed seated position removes lower back demands, isolating the upper back more effectively than bent-over rows. Different handles (V-bar, wide bar, rope) change muscle emphasis.",
        cues: [
            "Sit with a slight forward lean at the start to get a stretch in the lats.",
            "Pull the handle to your lower sternum / belly button.",
            "Squeeze shoulder blades together at peak contraction.",
            "Return with control — don't let the weight stack slam.",
        ],
        commonMistakes: [
            "Excessive torso rocking — using momentum instead of muscle.",
            "Rounding the back at the stretch position.",
            "Pulling too high (to the chest) — shifts emphasis to traps.",
        ],
        alternatives: ["Barbell Rows", "Chest-Supported Rows", "Single-Arm Cable Row"],
        notes:
            "A V-bar attachment targets the mid-back and lats. A wide bar shifts emphasis to the rhomboids and rear delts. Experiment with different attachments every few weeks.",
    },
    {
        id: "e-face-pulls",
        name: "Face Pulls",
        category: "Pull",
        muscles: {
            primary: ["Posterior Deltoids", "Rhomboids", "External Rotators"],
            secondary: ["Middle Trapezius", "Infraspinatus", "Teres Minor"],
        },
        youtubeId: "V8dZ3pyiCBo",
        biomechanics:
            "A horizontal pull with external rotation at the shoulder. This unique combination targets the posterior deltoids and the rotator cuff simultaneously, making it one of the most important exercises for shoulder health and posture. It directly opposes the effects of bench pressing and sitting at a desk.",
        cues: [
            "Set the cable at face height or slightly above.",
            "Pull the rope to your forehead, splitting the rope apart.",
            "Externally rotate at the end — thumbs should point backward behind your head.",
            "Hold the end position for a 1-2 second squeeze.",
        ],
        commonMistakes: [
            "Using too much weight and turning it into a row (pulling to the chest).",
            "Not externally rotating at the endpoint.",
            "Leaning back excessively to compensate for weight.",
        ],
        alternatives: ["Band Pull-Aparts", "Reverse Pec Deck", "Prone Y-Raises"],
        notes:
            "Face pulls are not optional — they are a MUST. For every set of pressing you do, you should almost match it with a pulling or external rotation movement. 3x15 keeps your shoulders healthy and your posture upright.",
    },
    {
        id: "e-ez-bar-curls",
        name: "EZ-Bar Curls",
        category: "Pull",
        muscles: {
            primary: ["Biceps Brachii (Short & Long Head)"],
            secondary: ["Brachialis", "Brachioradialis"],
        },
        youtubeId: "kwG2ipm4k04",
        biomechanics:
            "An elbow flexion exercise. The EZ-bar's angled grip places the wrists in a semi-supinated position, reducing wrist strain vs. a straight bar. This grip slightly reduces biceps short head activation but is much more comfortable for most lifters, allowing heavier loads over time.",
        cues: [
            "Keep elbows pinned at your sides throughout.",
            "Curl with a controlled tempo — 2s up, 2s down minimum.",
            "Squeeze the biceps hard at the top of the curl.",
            "Lower until arms are fully extended — full ROM.",
        ],
        commonMistakes: [
            "Swinging the weight up (cheat curls) — unless intentionally done for overload.",
            "Elbows drifting forward — this shortens the range of motion.",
            "Cutting the range of motion short at the bottom.",
        ],
        alternatives: ["Straight Bar Curls", "Dumbbell Curls", "Cable Curls"],
        notes:
            "For arm thickness, the EZ-bar curl is bread and butter. If you experience wrist pain even with the EZ-bar, switch to dumbbells with a neutral or supinated grip.",
    },
    {
        id: "e-hammer-curls",
        name: "Hammer Curls",
        category: "Pull",
        muscles: {
            primary: ["Brachialis", "Brachioradialis"],
            secondary: ["Biceps Brachii (Long Head)"],
        },
        youtubeId: "zC3nLlEvin4",
        biomechanics:
            "A neutral-grip elbow flexion exercise. The neutral (palms facing each other) grip shifts emphasis from the biceps to the brachialis and the brachioradialis. The brachialis sits underneath the biceps — developing it pushes the bicep up, making the arm appear thicker from the front.",
        cues: [
            "Keep palms facing each other (neutral grip) throughout.",
            "Curl straight up without rotating the wrist.",
            "Keep elbows fixed at your sides — no swinging.",
            "Squeeze at the top and lower with a slow eccentric.",
        ],
        commonMistakes: [
            "Rotating wrists into supination — then it's just a regular curl.",
            "Using momentum / swinging the dumbbells.",
            "Alternating arms with momentum from the other side.",
        ],
        alternatives: ["Cross-Body Hammer Curls", "Rope Cable Curls", "Zottman Curls"],
        notes:
            "Hammer curls build the muscles that make arms look THICK, not just peaked. They also strengthen the forearms significantly, which carries over to all pulling and gripping exercises.",
    },
    {
        id: "e-single-arm-rows",
        name: "Single-Arm Rows",
        category: "Pull",
        muscles: {
            primary: ["Latissimus Dorsi", "Rhomboids"],
            secondary: ["Biceps Brachii", "Posterior Deltoids", "Teres Major"],
        },
        youtubeId: "pYcpY20QaE8",
        biomechanics:
            "A unilateral horizontal pull. Working one arm at a time allows you to lift heavier per side, correct imbalances, and achieve a greater range of motion (more lat stretch and contraction). The free hand supports the body, removing lower back stress.",
        cues: [
            "Support yourself with one hand and knee on a bench.",
            "Pull the dumbbell toward your hip, not your chest.",
            "Drive your elbow straight back and up, squeezing the lat.",
            "Allow a full stretch at the bottom — let the shoulder blade protract slightly.",
        ],
        commonMistakes: [
            "Rotating the torso excessively to hoist weight up.",
            "Pulling to the chest instead of the hip — shifts to upper back.",
            "Not achieving full ROM — both stretch and contraction.",
        ],
        alternatives: ["Chest-Supported Row", "Meadows Row", "Landmine Row"],
        notes:
            "Single-arm rows allow you to focus on the mind-muscle connection with the lats. If you feel it in your bicep more than your back, focus on pulling with your elbow, not your hand.",
    },
    {
        id: "e-close-grip-pulldowns",
        name: "Close-Grip Pulldowns",
        category: "Pull",
        muscles: {
            primary: ["Latissimus Dorsi (Lower Fibers)"],
            secondary: ["Biceps Brachii", "Teres Major", "Rhomboids"],
        },
        youtubeId: "ecyXEyus2wQ",
        biomechanics:
            "A vertical pull with a close/neutral grip. The closer grip increases the range of motion and allows for greater shoulder extension, biasing the lower lat fibers. This builds the 'sweep' of the lats that creates a V-taper. Also increases bicep involvement.",
        cues: [
            "Use a V-bar or close-grip handle.",
            "Lean back slightly (10-15°) and pull the handle to your upper chest.",
            "Drive elbows down and back, squeezing lats hard at the bottom.",
            "Extend fully at the top for a lat stretch.",
        ],
        commonMistakes: [
            "Leaning back too much — turns it into a row.",
            "Using body weight momentum to pull the cable down.",
            "Not fully extending at the top, cutting the stretch short.",
        ],
        alternatives: ["Wide-Grip Lat Pulldowns", "Pull-ups", "Straight-Arm Pulldowns"],
        notes:
            "Pair this with a wider-grip vertical pull to hit the lats from multiple angles. The close-grip targets lower lat development, essential for a complete V-taper.",
    },
    {
        id: "e-straight-arm-pulldowns",
        name: "Straight-Arm Pulldowns",
        category: "Pull",
        muscles: {
            primary: ["Latissimus Dorsi"],
            secondary: ["Teres Major", "Posterior Deltoids", "Long Head of Triceps"],
        },
        youtubeId: "j3kE1p_bUHM",
        biomechanics:
            "A pure shoulder extension movement with minimal elbow flexion. This isolates the lats without bicep involvement, making it an excellent exercise for improving the mind-muscle connection with the lats. Often used as an activation exercise before heavy rows/pulls.",
        cues: [
            "Stand with a slight forward lean, arms extended overhead holding a straight bar or rope.",
            "Pull the bar down in an arc to your thighs, keeping arms nearly straight.",
            "Squeeze lats hard at the bottom — try to tuck your elbows behind you.",
            "Control the return — don't let the weight pull you forward.",
        ],
        commonMistakes: [
            "Bending the elbows too much — turns it into a pulldown.",
            "Using too much weight and rocking the body.",
            "Not squeezing hard at the contracted position.",
        ],
        alternatives: ["Dumbbell Pullovers", "Machine Pullovers", "Cable Pullovers"],
        notes:
            "If you struggle to 'feel' your lats during pull-ups and rows, doing 2 light sets of straight-arm pulldowns as a primer before your back workout can dramatically improve your mind-muscle connection.",
    },
    {
        id: "e-reverse-pec-deck",
        name: "Reverse Pec Deck",
        category: "Pull",
        muscles: {
            primary: ["Posterior Deltoids"],
            secondary: ["Rhomboids", "Middle Trapezius", "Infraspinatus"],
        },
        youtubeId: "5qIikIqEqm8",
        biomechanics:
            "Horizontal abduction of the shoulder in a fixed machine path. Isolates the rear delts with minimal trap involvement when performed correctly. The machine stabilization allows full focus on the posterior deltoid contraction.",
        cues: [
            "Adjust seat so handles are at shoulder height.",
            "Keep a slight bend in elbows (don't lock out).",
            "Initiate with the rear delts, don't pull with traps.",
            "Hold the peak contraction for 1-2 seconds.",
        ],
        commonMistakes: [
            "Using too much weight and shrugging the handles back.",
            "Setting the seat too low or too high.",
            "Going too fast — this is a contraction-based exercise.",
        ],
        alternatives: ["Face Pulls", "Band Pull-Aparts", "Bent-Over Rear Delt Flyes"],
        notes:
            "Rear delts are the most undertrained muscle for most lifters. Developing them completes the 3D 'cannonball' shoulder look and is critical for shoulder health and posture correction.",
    },
    {
        id: "e-preacher-curls",
        name: "Preacher Curls",
        category: "Pull",
        muscles: {
            primary: ["Biceps Brachii (Short Head)"],
            secondary: ["Brachialis"],
        },
        youtubeId: "fIWP-FRFNU0",
        biomechanics:
            "An elbow flexion exercise with the upper arm braced against an angled pad. This eliminates all cheating / momentum and isolates the biceps. The angled pad shifts peak tension to the bottom/stretched position of the curl, making it one of the best short head / bicep peak exercises.",
        cues: [
            "Sit with armpits snug against the top of the pad.",
            "Lower the weight until arms are nearly fully extended (maintain slight bend to protect elbows).",
            "Curl up and squeeze hard at the top.",
            "Don't lift your elbows off the pad.",
        ],
        commonMistakes: [
            "Not going low enough — half-repping preacher curls makes them pointless.",
            "Lifting elbows off the pad to use momentum.",
            "Going too heavy and hyperextending at the bottom — risk of bicep tear.",
        ],
        alternatives: ["Spider Curls", "Incline Dumbbell Curls", "Cable Preacher Curls"],
        notes:
            "Preacher curls with a slow eccentric (3-4 seconds down) are one of the most effective bicep growth stimuli. The stretch under load is a powerful hypertrophy trigger.",
    },

    // ═══════════════════════════════════════
    // LEG EXERCISES
    // ═══════════════════════════════════════
    {
        id: "e-barbell-squats",
        name: "Barbell Squats",
        category: "Legs",
        muscles: {
            primary: ["Quadriceps", "Gluteus Maximus"],
            secondary: ["Hamstrings", "Adductors", "Erector Spinae", "Core"],
        },
        youtubeId: "bEv6CCg2bc8",
        biomechanics:
            "The king of lower body exercises. A compound movement involving hip extension, knee extension, and ankle dorsiflexion. High bar position (on traps) creates a more upright torso and quad-dominant squat. Low bar (on rear delts) allows more hip hinge and posterior chain involvement. Both are valid.",
        cues: [
            "Brace your core hard before descending (Valsalva maneuver).",
            "Break at both hips and knees simultaneously.",
            "Drive knees outward to track over the mid-foot / toes.",
            "Keep your chest up and maintain a neutral spine.",
            "Descend to at least parallel — hip crease below the knee.",
        ],
        commonMistakes: [
            "Knees caving inward (valgus collapse) — strengthened by glute activation work.",
            "Good-morning the squat (hips rise faster than the chest).",
            "Not bracing properly — leads to spinal flexion under load.",
            "Cutting depth short — 'half squats build half legs'.",
        ],
        alternatives: ["Hack Squat", "Leg Press", "Goblet Squat", "Front Squat"],
        notes:
            "Squats are your primary leg strength marker. 4x6-8 on Heavy Legs day with progressive overload. If mobility limits your depth, work on ankle dorsiflexion (heel elevators or squat shoes help). Film yourself from the side to check depth.",
    },
    {
        id: "e-rdl",
        name: "RDLs",
        category: "Legs",
        muscles: {
            primary: ["Hamstrings", "Gluteus Maximus"],
            secondary: ["Erector Spinae", "Adductor Magnus"],
        },
        youtubeId: "jEy_czb3RKA",
        biomechanics:
            "A hip hinge pattern that maximally stretches the hamstrings under load. Unlike conventional deadlifts, the knees remain slightly bent and fixed, and the bar doesn't touch the floor. This isolates the hip extensors (hamstrings and glutes) while minimizing quads.",
        cues: [
            "Keep a slight, fixed knee bend throughout — don't bend more as you descend.",
            "Push your hips back like you're closing a car door with your glutes.",
            "Keep the bar/dumbbells dragging along your thighs.",
            "Stop when you feel a maximal hamstring stretch (usually mid-shin to below knee).",
            "Drive hips forward to return — squeeze the glutes at the top.",
        ],
        commonMistakes: [
            "Bending knees too much — turns it into a squat/deadlift hybrid.",
            "Rounding the lower back to go deeper.",
            "Looking straight up (hyperextending the neck).",
            "Letting the bar drift away from the body.",
        ],
        alternatives: ["Stiff-Leg Deadlift", "Good Mornings", "Single-Leg RDLs"],
        notes:
            "RDLs are arguably the best exercise for developing hamstrings through a lengthened position. The stretch under load is a potent hypertrophy stimulus. Use straps if grip fails before hamstrings fatigue.",
    },
    {
        id: "e-leg-press",
        name: "Leg Press",
        category: "Legs",
        muscles: {
            primary: ["Quadriceps", "Gluteus Maximus"],
            secondary: ["Hamstrings", "Adductors"],
        },
        youtubeId: "IZxyjW7OSvc",
        biomechanics:
            "A machine-based compound push that removes spinal loading. Foot placement dramatically changes emphasis: high and wide targets glutes/hamstrings, low and narrow targets quads. The leg press allows you to load the legs heavily without the limiting factor of spinal erector fatigue from squats.",
        cues: [
            "Place feet shoulder-width apart, mid-platform for balanced quad/glute emphasis.",
            "Lower the sled until knees reach approximately 90° (do not let lower back round off the pad).",
            "Press through your full foot, emphasizing heels for glutes.",
            "Don't lock out knees at the top — maintain slight bend.",
        ],
        commonMistakes: [
            "Going too deep and letting the lower back round off the pad.",
            "Locking out knees at the top (risk of hyperextension).",
            "Using too much weight with a tiny range of motion (ego pressing).",
        ],
        alternatives: ["Hack Squat", "Belt Squat", "Smith Machine Squat"],
        notes:
            "After heavy squats, the leg press allows you to safely accumulate more quad volume without taxing the lower back. Use 3x10-12 to push hypertrophy.",
    },
    {
        id: "e-lying-leg-curls",
        name: "Lying Leg Curls",
        category: "Legs",
        muscles: {
            primary: ["Hamstrings (Biceps Femoris, Semimembranosus, Semitendinosus)"],
            secondary: ["Gastrocnemius"],
        },
        youtubeId: "F488k67BTNo",
        biomechanics:
            "An isolated knee flexion exercise. With hips extended (lying flat), the hamstrings are in a shortened position at the hip, meaning the short head of the biceps femoris contributes more. For full hamstring development, combine with RDLs (which stretch the hamstrings at the hip).",
        cues: [
            "Adjust the pad so it sits above your heels, on the lower calves.",
            "Keep hips pressed against the pad — no lifting off.",
            "Curl until your shins are approximately perpendicular to the floor.",
            "Lower under control — the eccentric is where the growth happens.",
        ],
        commonMistakes: [
            "Lifting hips off the pad to use momentum.",
            "Cutting the ROM short — full range is critical.",
            "Using too much weight and bouncing at the bottom.",
        ],
        alternatives: ["Seated Leg Curls", "Nordic Hamstring Curls", "Swiss Ball Curls"],
        notes:
            "RDLs work hamstrings at long lengths; leg curls work them at short lengths. You need BOTH for complete hamstring development. This combination reduces hamstring injury risk significantly.",
    },
    {
        id: "e-calf-raises",
        name: "Calf Raises",
        category: "Legs",
        muscles: {
            primary: ["Gastrocnemius", "Soleus"],
            secondary: ["Tibialis Posterior"],
        },
        youtubeId: "eMTy3wqLQMQ",
        biomechanics:
            "Ankle plantarflexion, isolating the calf muscles. Standing calf raises (with straight knees) target the gastrocnemius. Seated calf raises (with bent knees) target the soleus. The soleus makes up about 60% of the calf, so both variations are important.",
        cues: [
            "Use a full range of motion — stretch deeply at the bottom for 2 seconds.",
            "Drive up onto the balls of your feet as high as possible.",
            "Hold the peak contraction for 1-2 seconds.",
            "Use a slow eccentric (3 seconds down).",
        ],
        commonMistakes: [
            "Bouncing at the bottom without a full stretch.",
            "Using tiny ROM with huge weight.",
            "Not training calves frequently enough — they can handle very high frequency.",
        ],
        alternatives: ["Seated Calf Raises", "Donkey Calf Raises", "Single-Leg Calf Raises"],
        notes:
            "Calves are notoriously stubborn. The key to growth is: 1) Full ROM with a deep stretch, 2) Heavy enough to challenge 15-20 reps, 3) Frequency — train calves 3-4x per week if they're a weak point.",
    },
    {
        id: "e-hack-squats",
        name: "Hack Squats",
        category: "Legs",
        muscles: {
            primary: ["Quadriceps"],
            secondary: ["Gluteus Maximus", "Adductors"],
            },
        youtubeId: "r5kK_vQJOhk",
        biomechanics:
            "A machine-based squat variation where the back is supported against a pad on an angled sled. This removes spinal loading and forces a more knee-dominant movement pattern, making it one of the purest quad builders available. Low foot placement increases quad demand; high placement adds glute bias.",
        cues: [
            "Place feet low on the platform for maximum quad emphasis.",
            "Descend until your thighs are at least parallel to the platform.",
            "Drive through the balls of your feet for quad emphasis.",
            "Keep knees tracking in line with toes.",
        ],
        commonMistakes: [
            "Cutting depth — hack squats are most effective deep.",
            "Letting knees cave inward.",
            "Placing feet too high (reduces quad emphasis).",
        ],
        alternatives: ["Leg Press", "Pendulum Squat", "Sissy Squat"],
        notes:
            "Hack squats are the quad builder of choice on Hyper Legs day. The machine support means you can push much closer to failure safely compared to free-weight squats.",
    },
    {
        id: "e-leg-extensions",
        name: "Leg Extensions",
        category: "Legs",
        muscles: {
            primary: ["Quadriceps (Rectus Femoris, Vastus Lateralis, Vastus Medialis, Vastus Intermedius)"],
            secondary: [],
        },
        youtubeId: "YyvSfVjQeL0",
        biomechanics:
            "Pure knee extension in isolation. The only exercise that truly isolates the quadriceps without any glute or hamstring involvement. Peak tension occurs at full knee extension, making it excellent for VMO (inner quad 'teardrop') development and quad separation.",
        cues: [
            "Adjust the pad so it sits on your lower shin, just above the ankle.",
            "Extend fully and squeeze the quads hard at the top for 1-2 seconds.",
            "Lower with a 3-second eccentric.",
            "Don't swing — control the weight throughout.",
        ],
        commonMistakes: [
            "Using momentum to swing the weight up.",
            "Not reaching full extension.",
            "Going too heavy and stressing the knees.",
        ],
        alternatives: ["Sissy Squats", "Spanish Squats", "Poliquin Step-ups"],
        notes:
            "Despite old myths, leg extensions are safe for healthy knees when performed with control and within a pain-free range. They are invaluable for quad development and knee health when combined with hamstring work.",
    },
    {
        id: "e-seated-leg-curls",
        name: "Seated Leg Curls",
        category: "Legs",
        muscles: {
            primary: ["Hamstrings"],
            secondary: ["Gastrocnemius"],
        },
        youtubeId: "F488k67BTNo",
        biomechanics:
            "Knee flexion from a seated position. With hips flexed (seated), the hamstrings are in a more stretched position at the hip compared to lying curls, potentially offering a better lengthened stimulus. Recent research suggests seated curls may produce slightly more hamstring hypertrophy than lying curls.",
        cues: [
            "Adjust the pad and seat so the knee joint aligns with the machine's pivot point.",
            "Curl the pad down as far as possible.",
            "Squeeze at the bottom, then control the eccentric as you extend.",
            "Keep your back against the pad throughout.",
        ],
        commonMistakes: [
            "Sliding forward on the seat, losing hip position.",
            "Using a fast, bouncy tempo.",
            "Not aligning knees with the machine pivot.",
        ],
        alternatives: ["Lying Leg Curls", "Nordic Curls", "Swiss Ball Hamstring Curls"],
        notes:
            "If you can only pick one hamstring curl variation, recent literature slightly favors the seated leg curl for overall hypertrophy. Combine with RDLs for complete hamstring development.",
    },
    {
        id: "e-walking-lunges",
        name: "Walking Lunges",
        category: "Legs",
        muscles: {
            primary: ["Quadriceps", "Gluteus Maximus"],
            secondary: ["Hamstrings", "Adductors", "Core (Stabilization)"],
        },
        youtubeId: "L8fvypPrzzs",
        biomechanics:
            "A dynamic unilateral leg exercise. Each stride involves a deep split squat pattern, providing a huge stretch on the hip flexors of the trailing leg and a powerful contraction on the lead leg's glutes and quads. The walking component adds balance and coordination challenges.",
        cues: [
            "Take long strides to emphasize glutes, shorter strides for quads.",
            "Drop the back knee toward the floor until the front thigh is parallel.",
            "Keep torso upright — don't lean forward.",
            "Drive through the heel of the front foot to step forward.",
        ],
        commonMistakes: [
            "Taking too-short steps (reduces ROM).",
            "Front knee traveling too far past the toes.",
            "Leaning forward excessively.",
            "Losing balance and wobbling side to side.",
        ],
        alternatives: ["Reverse Lunges", "Bulgarian Split Squats", "Step-ups"],
        notes:
            "Walking lunges at 3x12/leg is a massive hypertrophy stimulus. They also build unilateral stability critical for injury prevention. If space is limited, do reverse lunges in place.",
    },

    // ═══════════════════════════════════════
    // ACTIVE RECOVERY
    // ═══════════════════════════════════════
    {
        id: "e-treadmill-walk",
        name: "Treadmill Incline Walk",
        category: "Cardio/Mobility",
        muscles: {
            primary: ["Gluteus Maximus", "Hamstrings", "Calves"],
            secondary: ["Quadriceps", "Core"],
        },
        youtubeId: "2WzN8zC_TCE",
        biomechanics:
            "Low-intensity steady-state (LISS) cardio on an incline. The incline increases glute and hamstring activation while keeping the movement low-impact. This is the ideal cardio for a recomp — burns calories without the muscle-damaging impact of running, and doesn't create excessive fatigue that impairs recovery.",
        cues: [
            "Set incline to 10-15% for maximum posterior chain engagement.",
            "Walk at 5-6 km/h — brisk but conversational pace.",
            "Don't hold onto the handrails — pump your arms naturally.",
            "Maintain good posture — chest up, shoulders back.",
        ],
        commonMistakes: [
            "Holding the handrails — this dramatically reduces calories burned and postural benefits.",
            "Setting the speed too fast (if you need to jog, reduce incline or speed).",
            "Skipping it entirely — active recovery is critical for recomp.",
        ],
        alternatives: ["Stairmaster", "Outdoor Hill Walking", "Cycling (low intensity)"],
        notes:
            "45 minutes of incline walking at 10-12% burns roughly 300-400 calories without generating muscle-damaging stress. This is your secret weapon during recomp for accelerating fat loss without hindering muscle recovery.",
    },
    {
        id: "e-mobility-work",
        name: "Mobility Work",
        category: "Cardio/Mobility",
        muscles: {
            primary: ["Hip Flexors", "Thoracic Spine", "Ankles"],
            secondary: ["Shoulders", "Hamstrings", "Adductors"],
        },
        biomechanics:
            "Active flexibility and joint mobility work. Targets the major movement restrictions that limit squat depth, overhead pressing mechanics, and general movement quality. Not just stretching — active mobility work improves motor control through ranges of motion.",
        cues: [
            "Spend 2-3 minutes on each major area: hips, thoracic spine, ankles, shoulders.",
            "Use dynamic movements, not static holds (save static stretching for bedtime).",
            "Focus on areas that feel most restricted.",
            "World's Greatest Stretch is the single best mobility drill — do 5 reps per side.",
        ],
        commonMistakes: [
            "Skipping mobility entirely because 'it doesn't build muscle'.",
            "Only doing static stretches (less effective pre-workout).",
            "Not being consistent — mobility improves slowly over weeks.",
        ],
        alternatives: ["Yoga Flow", "Foam Rolling", "Band-Assisted Stretches"],
        notes:
            "Poor ankle mobility limits squat depth. Poor thoracic mobility limits overhead pressing. Poor hip mobility limits deadlift and squat form. 15 minutes of consistent daily mobility work will transform your lifting within 4-6 weeks.",
    },
];

const FREE_WEIGHT_EQUIPMENT = new Set<ExerciseEquipment>([
    "barbell",
    "dumbbell",
    "kettlebell",
    "landmine",
]);

const MACHINE_DEPENDENT_EQUIPMENT = new Set<ExerciseEquipment>([
    "machine",
    "cable",
    "smith-machine",
]);

const HOME_GYM_EQUIPMENT = new Set<ExerciseEquipment>([
    "barbell",
    "dumbbell",
    "kettlebell",
    "bench",
    "bodyweight",
    "band",
    "pull-up-bar",
    "landmine",
]);

const GENERIC_BEST_FOR: Record<ExerciseWiki["category"], string[]> = {
    Push: ["strength carryover", "muscle gain", "joint-friendly programming choices"],
    Pull: ["back balance", "grip development", "posture support"],
    Legs: ["lower-body strength", "athletic base", "equipment-flexible substitutions"],
    Core: ["trunk control", "better bracing", "low-equipment training"],
    "Cardio/Mobility": ["recovery support", "conditioning", "access-friendly training days"],
};

const GENERIC_SETUP_BY_EQUIPMENT: Partial<Record<ExerciseEquipment, string[]>> = {
    barbell: ["Set the bar path and rack height before the first set."],
    dumbbell: ["Choose a load you can set up without wasting reps on the entry."],
    kettlebell: ["Keep the handle path close to the body for better control."],
    bench: ["Set the bench angle and foot position before loading hard."],
    bodyweight: ["Own clean range of motion before you chase extra reps."],
    band: ["Anchor the band before you load it aggressively."],
    machine: ["Adjust the machine setup to your joints, not the other way around."],
    cable: ["Set the cable height and line of pull before the work sets begin."],
    "smith-machine": ["Use a stance that matches the machine's fixed bar path."],
    landmine: ["Anchor the landmine securely before pressing or rowing from it."],
    "pull-up-bar": ["Choose a grip and range of motion you can own every rep."],
};

const normalizeUniqueStrings = (values: string[]) =>
    Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter(Boolean)
        )
    );

const withoutSelf = (values: string[], currentName: string) =>
    normalizeUniqueStrings(values).filter((value) => value !== currentName);

const buildGenericSetupChecklist = (equipment: ExerciseEquipment[]) =>
    normalizeUniqueStrings(
        equipment.flatMap((item) => GENERIC_SETUP_BY_EQUIPMENT[item] ?? [])
    );

const inferDifficulty = (equipment: ExerciseEquipment[]) => {
    if (equipment.includes("machine") || equipment.includes("cable")) return "Beginner";
    if (equipment.includes("barbell") || equipment.includes("landmine")) return "Intermediate";
    return "Beginner";
};

const enrichExerciseEntry = (entry: ExerciseWiki): ExerciseWiki => {
    const enhancement = EXERCISE_ENHANCEMENTS[entry.name];
    const equipment = entry.equipment ?? enhancement?.equipment ?? ["bodyweight"];
    const freeWeightAlternatives = withoutSelf(
        entry.freeWeightAlternatives ??
            enhancement?.freeWeightAlternatives ??
            entry.alternatives,
        entry.name
    );
    const minimalEquipmentAlternatives = withoutSelf(
        entry.minimalEquipmentAlternatives ??
            enhancement?.minimalEquipmentAlternatives ??
            freeWeightAlternatives,
        entry.name
    );

    return {
        ...enhancement,
        ...entry,
        equipment,
        difficulty:
            entry.difficulty ?? enhancement?.difficulty ?? inferDifficulty(equipment),
        movementPattern:
            entry.movementPattern ?? enhancement?.movementPattern ?? entry.category,
        bestFor: normalizeUniqueStrings([
            ...(GENERIC_BEST_FOR[entry.category] ?? []),
            ...(enhancement?.bestFor ?? []),
            ...(entry.bestFor ?? []),
        ]),
        setupChecklist: normalizeUniqueStrings([
            ...buildGenericSetupChecklist(equipment),
            ...(enhancement?.setupChecklist ?? []),
            ...(entry.setupChecklist ?? []),
        ]),
        alternatives: normalizeUniqueStrings(entry.alternatives),
        freeWeightAlternatives,
        minimalEquipmentAlternatives,
        homeGymFriendly:
            entry.homeGymFriendly ??
            enhancement?.homeGymFriendly ??
            equipment.every((item) => HOME_GYM_EQUIPMENT.has(item)),
    };
};

export const WIKI_DATA: ExerciseWiki[] = [
    ...BASE_WIKI_DATA,
    ...ADDITIONAL_WIKI_DATA,
].map(enrichExerciseEntry);

const WIKI_MAP = new Map<string, ExerciseWiki>(
    WIKI_DATA.map((entry) => [entry.name.toLowerCase().trim(), entry])
);

const resolveEntry = (entryOrName: ExerciseWiki | string) =>
    typeof entryOrName === "string" ? findWikiEntry(entryOrName) : entryOrName;

export function findWikiEntry(exerciseName: string): ExerciseWiki | undefined {
    return WIKI_MAP.get(exerciseName.toLowerCase().trim());
}

export function isFreeWeightFriendly(entryOrName: ExerciseWiki | string): boolean {
    const entry = resolveEntry(entryOrName);
    if (!entry) return false;

    const equipment = entry.equipment ?? [];
    const usesAccessibleLoading =
        equipment.some((item) => FREE_WEIGHT_EQUIPMENT.has(item)) ||
        equipment.includes("bodyweight");
    const requiresMachine = equipment.some((item) =>
        MACHINE_DEPENDENT_EQUIPMENT.has(item)
    );

    return usesAccessibleLoading && !requiresMachine;
}

export function isHomeGymFriendly(entryOrName: ExerciseWiki | string): boolean {
    const entry = resolveEntry(entryOrName);
    if (!entry) return false;
    return !!entry.homeGymFriendly;
}

export function getFreeWeightAlternatives(
    entryOrName: ExerciseWiki | string
): string[] {
    const entry = resolveEntry(entryOrName);
    if (!entry) return [];
    return entry.freeWeightAlternatives ?? [];
}

export function getMinimalEquipmentAlternatives(
    entryOrName: ExerciseWiki | string
): string[] {
    const entry = resolveEntry(entryOrName);
    if (!entry) return [];
    return entry.minimalEquipmentAlternatives ?? [];
}

export function resolvePrimaryFreeWeightAlternative(
    exerciseName: string
): string | undefined {
    return getFreeWeightAlternatives(exerciseName)[0];
}

