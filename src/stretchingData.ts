import type { Stretch, StretchingProgram } from "./types";

const STRETCH_LIBRARY: Record<string, Stretch> = {
    "cross-body-shoulder": {
        id: "cross-body-shoulder",
        name: "Cross-Body Shoulder Stretch",
        duration: 35,
        sides: 2,
        description: "Pull one arm across the chest to open the rear shoulder and upper back.",
        instructions: [
            "Stand or sit tall with a neutral spine.",
            "Bring one arm directly across the front of your chest.",
            "Use your opposite hand or forearm to gently press the elbow closer to your body.",
            "Hold the gentle stretch in the back of the shoulder."
        ],
        targetAreas: ["rear delts", "posterior shoulder", "upper back"],
        cues: [
            "Keep the shoulder down while you gently pull the arm across.",
            "Think about length, not cranking the joint into end range.",
        ],
        benefits: ["eases pressing tightness", "restores shoulder reach"],
        commonMistakes: [
            "Shrugging the shoulder toward the ear.",
            "Twisting the torso instead of isolating the shoulder.",
        ],
        regression: "Reduce the pull and hold the elbow closer to the chest.",
        progression: "Pair with slow scapular protraction / retraction between holds.",
        equipment: ["None"],
    },
    "overhead-tricep": {
        id: "overhead-tricep",
        name: "Overhead Tricep Stretch",
        duration: 35,
        sides: 2,
        description: "Reach one hand down the back and guide the elbow overhead for tricep and lat length.",
        instructions: [
            "Reach one arm straight up to the ceiling, then bend the elbow so your hand touches your upper back.",
            "Use your free hand to gently pull the raised elbow backward and inward.",
            "Keep your chest tall and ribs pulled down."
        ],
        targetAreas: ["triceps", "lats", "long head shoulder tissues"],
        cues: [
            "Keep ribs down instead of leaning backward.",
            "Let the elbow point up before gently drawing it in.",
        ],
        benefits: ["helps overhead comfort", "offsets heavy pressing volume"],
        commonMistakes: [
            "Arching the low back to fake more range.",
            "Forcing the elbow inward aggressively.",
        ],
        regression: "Use a smaller range with the hand behind the head instead of between the shoulder blades.",
        progression: "Add gentle side-bending away from the stretched arm.",
        equipment: ["None"],
    },
    "doorway-chest": {
        id: "doorway-chest",
        name: "Doorway Chest Stretch",
        duration: 40,
        sides: 2,
        description: "Use a wall or door frame to open the pecs and front delts after pressing.",
        instructions: [
            "Stand inside a doorway or next to a wall.",
            "Place your forearm vertically flat against the frame at about shoulder height.",
            "Step forward slightly with one foot and rotate your chest gently away from the elevated arm.",
            "Hold when you feel a stretch across the chest and front shoulder."
        ],
        targetAreas: ["chest", "front delts", "biceps tendon"],
        cues: [
            "Keep the shoulder blade tucked gently down the back.",
            "Rotate the torso away instead of jamming the shoulder forward.",
        ],
        benefits: ["opens postural tightness", "helps recover from push sessions"],
        commonMistakes: [
            "Driving the shoulder head forward into the joint.",
            "Going too high with the arm and irritating the front shoulder.",
        ],
        regression: "Drop the elbow lower and reduce torso rotation.",
        progression: "Run two positions: arm slightly below shoulder height and slightly above.",
        equipment: ["Door frame", "Wall"],
    },
    "thread-the-needle": {
        id: "thread-the-needle",
        name: "Thread the Needle",
        duration: 40,
        description: "A thoracic rotation stretch that opens the upper back and rear shoulder.",
        instructions: [
            "Start on hands and knees in a tabletop position.",
            "Slide one arm underneath your body, sliding the back of the hand along the floor.",
            "Gently rest your shoulder and side of your head on the floor.",
            "Use your other hand to press against the floor, deepening the stretch."
        ],
        targetAreas: ["thoracic spine", "rear shoulder", "mid-back"],
        cues: [
            "Reach long with the threaded arm and let the ribs rotate.",
            "Keep hips stacked over the knees while the upper back turns.",
        ],
        benefits: ["restores rotation", "helps overhead and bench setup positions"],
        commonMistakes: [
            "Shifting the hips too far back and losing the thoracic focus.",
            "Forcing the neck into the movement.",
        ],
        regression: "Place a pad under the shoulder and shorten the range.",
        progression: "Pause and breathe fully into the upper back.",
        equipment: ["None"],
    },
    "lat-prayer": {
        id: "lat-prayer",
        name: "Lat Prayer Stretch",
        duration: 35,
        description: "Sink the chest down with hands supported to lengthen the lats and long head triceps.",
        instructions: [
            "Kneel a few feet away from a bench, chair, or box.",
            "Place your elbows or hands flat on the elevated surface.",
            "Slowly sink your hips backward toward your heels.",
            "Drop your chest toward the floor, keeping your back straight."
        ],
        targetAreas: ["lats", "triceps", "mid-back"],
        cues: [
            "Keep the ribs tucked instead of collapsing through the low back.",
            "Reach the hands away while sitting the hips back slightly.",
        ],
        benefits: ["improves overhead reach", "helps post-pull stiffness"],
        commonMistakes: [
            "Arching hard in the low back.",
            "Letting the shoulders shrug up toward the ears.",
        ],
        regression: "Use a higher bench, box, or chair to reduce the angle.",
        progression: "Offset one hand at a time to bias each lat separately.",
        equipment: ["Bench", "Chair", "Wall"],
    },
    "wall-slides": {
        id: "wall-slides",
        name: "Wall Slides",
        duration: 30,
        description: "Glide the forearms up a wall to train upward rotation and serratus control.",
        instructions: [
            "Stand with your back flat against a wall, heels a few inches away.",
            "Place your elbows, forearms, and the back of your hands against the wall.",
            "Slowly slide your arms upward toward the ceiling in a 'Y' shape.",
            "Keep contact with the wall as much as possible, then lower slowly."
        ],
        targetAreas: ["serratus", "upper back", "shoulders"],
        cues: [
            "Keep ribs stacked and forearms heavy on the wall.",
            "Reach up without shrugging through the neck.",
        ],
        benefits: ["improves shoulder mechanics", "great desk-reset drill"],
        commonMistakes: [
            "Arching the back to reach higher.",
            "Letting the wrists and forearms peel away from the wall.",
        ],
        regression: "Use a smaller range and focus on clean upward rotation.",
        progression: "Add a lift-off at the top if control is solid.",
        equipment: ["Wall"],
    },
    "hamstring-fold": {
        id: "hamstring-fold",
        name: "Hamstring Stretch",
        duration: 40,
        description: "A long hamstring hold that targets the back of the thighs without rounding aggressively.",
        instructions: [
            "Stand tall or sit down with your legs extended in front of you.",
            "Keeping your chest tall, hinge forward at the hips.",
            "Reach your hands down toward your toes or ankles.",
            "Hold the position when you feel tension in the back of your legs."
        ],
        targetAreas: ["hamstrings", "calves"],
        cues: [
            "Lead with a hip hinge instead of rounding the spine first.",
            "Keep the front foot flexed to add calf tension if helpful.",
        ],
        benefits: ["post-leg recovery", "helps hinge depth and comfort"],
        commonMistakes: [
            "Forcing the chest down by rounding through the back.",
            "Locking the knee so hard that the hamstring never relaxes.",
        ],
        regression: "Bend the knee slightly or elevate the hips.",
        progression: "Add contract-relax reps before the final hold.",
        equipment: ["None"],
    },
    "couch-stretch": {
        id: "couch-stretch",
        name: "Couch Stretch",
        duration: 40,
        description: "A deep quad and hip-flexor opener that is excellent after squats, lunges, and long desk days.",
        instructions: [
            "Face away from a wall or bench and kneel down.",
            "Slide your back leg up the wall so your shin is vertical.",
            "Step your other foot forward into a lunge position.",
            "Slowly raise your torso upright until you feel a deep stretch in the front of your rear leg."
        ],
        targetAreas: ["quads", "hip flexors", "front hip"],
        cues: [
            "Squeeze the glute on the back leg before leaning upright.",
            "Stay tall instead of chasing range with lumbar extension.",
        ],
        benefits: ["reduces front-hip tightness", "supports squat and split-squat positions"],
        commonMistakes: [
            "Arching the low back excessively to feel more stretch.",
            "Starting too upright and getting crushed immediately.",
        ],
        regression: "Move the knee farther from the wall or support yourself with the hands.",
        progression: "Reach the same-side arm overhead once the base position is stable.",
        equipment: ["Wall", "Bench"],
    },
    "pigeon-pose": {
        id: "pigeon-pose",
        name: "Pigeon Pose",
        duration: 45,
        description: "A glute-focused stretch for the back hip that also helps external rotation tolerance.",
        instructions: [
            "Start in a downward dog or tabletop position.",
            "Bring one knee forward and place it behind your wrist, rotating your lower leg inward.",
            "Extend your other leg straight back behind you, lowering your hips to the floor.",
            "Keep your torso upright, or gently fold forward over your front leg."
        ],
        targetAreas: ["glutes", "deep hip rotators"],
        cues: [
            "Square the hips as much as possible before folding forward.",
            "Keep the front shin at an angle that feels controlled, not forced.",
        ],
        benefits: ["helps after leg days", "good for hip stiffness and sitting-heavy weeks"],
        commonMistakes: [
            "Trying to force the front shin parallel immediately.",
            "Collapsing all the weight onto one side of the pelvis.",
        ],
        regression: "Use a seated figure-four or support the hip with a block or cushion.",
        progression: "Add gentle forward folds with long exhales.",
        equipment: ["None"],
    },
    "adductor-rock-backs": {
        id: "adductor-rock-backs",
        name: "Adductor Rock Backs",
        duration: 35,
        description: "A dynamic groin and inner-thigh drill that opens hips without requiring extreme range.",
        instructions: [
            "Start on hands and knees.",
            "Extend one leg completely out to the side, foot flat on the floor.",
            "Keep your spine neutral and slowly sit your hips backward toward your heel.",
            "Return to the starting position with control. Repeat."
        ],
        targetAreas: ["adductors", "hips", "groin"],
        cues: [
            "Keep the spine long while sitting the hips back.",
            "Turn the extended-leg foot however your hips feel best.",
        ],
        benefits: ["helps squat depth", "reduces groin tightness before lower-body work"],
        commonMistakes: [
            "Rounding forward instead of hinging back.",
            "Pushing so deep that the groin grips harder.",
        ],
        regression: "Shorten the backward rock and support with yoga blocks.",
        progression: "Pause in the back position and breathe into the groin.",
        equipment: ["None"],
    },
    "ankle-dorsiflexion-rocks": {
        id: "ankle-dorsiflexion-rocks",
        name: "Ankle Dorsiflexion Rocks",
        duration: 30,
        description: "Drive the knee over the toes in a controlled way to improve ankle mobility for squats and lunges.",
        instructions: [
            "Kneel in a half-kneeling position, near a wall for balance if needed.",
            "Keeping your front heel flat on the ground, drive your knee fully forward over your toes.",
            "Hold for a brief moment at the end range.",
            "Push back to the start and repeat rhythmically."
        ],
        targetAreas: ["ankles", "calves", "achilles"],
        cues: [
            "Keep the heel heavy while the knee travels forward.",
            "Aim for smooth rocks instead of forcing a max stretch.",
        ],
        benefits: ["improves squat depth", "helps split squat comfort and knee travel"],
        commonMistakes: [
            "Letting the heel pop up immediately.",
            "Collapsing the arch as the knee moves forward.",
        ],
        regression: "Shorten the distance from the wall and move more slowly.",
        progression: "Add a longer pause at the front edge of the range.",
        equipment: ["Wall"],
    },
    "calf-wall-stretch": {
        id: "calf-wall-stretch",
        name: "Calf Wall Stretch",
        duration: 35,
        description: "A straight-leg calf stretch to open the gastroc and improve ankle comfort.",
        instructions: [
            "Stand facing a wall with your hands resting on it.",
            "Step one foot back, keeping that leg fully straight.",
            "Keep the back heel pressed firmly into the ground.",
            "Lean your hips forward gently to intensify the stretch out of the back calf."
        ],
        targetAreas: ["calves", "achilles"],
        cues: [
            "Press the heel down while keeping toes pointed forward.",
            "Use the hips to shift forward, not just the shoulders.",
        ],
        benefits: ["supports ankle mobility", "helps after running, walking, and leg sessions"],
        commonMistakes: [
            "Turning the foot out too much and losing the calf line.",
            "Bouncing the heel instead of settling into the stretch.",
        ],
        regression: "Shorten the stance and bend the back knee slightly.",
        progression: "Use a step for more range once the wall version is easy.",
        equipment: ["Wall"],
    },
    "cat-cow": {
        id: "cat-cow",
        name: "Cat-Cow",
        duration: 45,
        description: "A simple spinal wave that restores movement through the thoracic and lumbar segments.",
        instructions: [
            "Begin on your hands and knees in a tabletop position.",
            "Inhale as you drop your belly toward the floor, lifting your chest and tailbone (Cow).",
            "Exhale as you press the floor away, rounding your spine up and tucking your chin (Cat).",
            "Move smoothly between the two positions."
        ],
        targetAreas: ["thoracic spine", "lumbar spine", "neck"],
        cues: [
            "Move one vertebra at a time instead of rushing between end positions.",
            "Coordinate the breath with the motion to get more range without strain.",
        ],
        benefits: ["great warm-up", "helps reset stiffness after lifting or sitting"],
        commonMistakes: [
            "Making the movement too fast and sloppy.",
            "Forcing neck extension instead of moving through the whole spine.",
        ],
        regression: "Reduce the range and slow the breathing cadence.",
        progression: "Pause in each shape for a breath cycle.",
        equipment: ["None"],
    },
    "childs-pose": {
        id: "childs-pose",
        name: "Child's Pose",
        duration: 45,
        description: "A gentle reset for the hips, back, and shoulders that also encourages slower breathing.",
        instructions: [
            "Start on hands and knees. Widen your knees to about mat-width apart.",
            "Pish your hips all the way back to rest on your heels.",
            "Extend your arms straight forward and rest your forehead gently on the ground.",
            "Breathe deeply into your lower back."
        ],
        targetAreas: ["lats", "low back", "hips"],
        cues: [
            "Reach long through the fingertips while sitting the hips back.",
            "Use long exhales to let the torso soften deeper into the floor.",
        ],
        benefits: ["good cooldown reset", "pairs well with breathing work"],
        commonMistakes: [
            "Forcing the hips to the heels when the knees or ankles hate it.",
            "Shrugging the shoulders while reaching forward.",
        ],
        regression: "Place a cushion between hips and heels or widen the knees more.",
        progression: "Walk the hands side to side to bias each lat.",
        equipment: ["None"],
    },
    "downward-dog": {
        id: "downward-dog",
        name: "Downward Dog",
        duration: 40,
        description: "A full posterior-chain stretch that also loads the shoulders and upper back.",
        instructions: [
            "Start in a plank position or on hands and knees.",
            "Tuck your toes and lift your hips high, extending your legs.",
            "Press firmly through your hands and aim to create an inverted 'V' shape.",
            "Pedal your heels toward the ground if needed to ease into the stretch."
        ],
        targetAreas: ["calves", "hamstrings", "lats", "shoulders"],
        cues: [
            "Push the floor away first, then gently drive the hips up and back.",
            "Bend the knees enough to keep the spine long before chasing heel contact.",
        ],
        benefits: ["full-body opener", "excellent bridge between upper and lower recovery work"],
        commonMistakes: [
            "Rounding the back to force the heels down.",
            "Dumping into the shoulders without active reach.",
        ],
        regression: "Bend the knees more and shorten the stance.",
        progression: "Pedal the heels or alternate single-leg emphasis.",
        equipment: ["None"],
    },
    "cobra-stretch": {
        id: "cobra-stretch",
        name: "Cobra Stretch",
        duration: 35,
        description: "A front-body opener for abs, hip flexors, and chest with gentle spinal extension.",
        instructions: [
            "Lie completely flat on your stomach with legs extended.",
            "Place your hands flat on the floor directly beneath your shoulders.",
            "Gently press up through your hands to lift your chest off the floor.",
            "Keep your hips grounded and avoid cranking your neck backward."
        ],
        targetAreas: ["abdominals", "front hip", "chest"],
        cues: [
            "Press through the hands while keeping the shoulders away from the ears.",
            "Use only as much extension as feels smooth and supported.",
        ],
        benefits: ["balances heavy hinging and sitting", "opens the front line of the body"],
        commonMistakes: [
            "Jamming the low back by forcing height.",
            "Shrugging hard and crowding the neck.",
        ],
        regression: "Use sphinx position on the forearms.",
        progression: "Add a gentle side bend for the obliques and lats.",
        equipment: ["None"],
    },
    "worlds-greatest-stretch": {
        id: "worlds-greatest-stretch",
        name: "World's Greatest Stretch",
        duration: 45,
        description: "A full-body mobility drill combining lunge, thoracic rotation, and hamstring work.",
        instructions: [
            "Step forward into a deep lunge, placing both hands flat on the floor inside your front foot.",
            "Drop the elbow of your inside arm down toward the floor, getting a deep hip stretch.",
            "Rotate that same arm open toward the ceiling, twisting your upper spine.",
            "Place the hand back down, rock your hips backward to stretch the front hamstring before standing up."
        ],
        targetAreas: ["hip flexors", "hamstrings", "thoracic spine", "adductors"],
        cues: [
            "Sink into the lunge first before reaching and rotating.",
            "Move slowly through each phase instead of rushing through the transitions.",
        ],
        benefits: ["excellent warm-up", "covers many common mobility restrictions at once"],
        commonMistakes: [
            "Treating it like cardio and blowing through the positions.",
            "Letting the front foot cave inward during the lunge.",
        ],
        regression: "Place the back knee down and reduce rotation range.",
        progression: "Add a hamstring hinge before returning to the lunge.",
        equipment: ["None"],
    },
    "ninety-ninety-switches": {
        id: "ninety-ninety-switches",
        name: "90/90 Hip Switches",
        duration: 40,
        description: "A seated hip-rotation drill that trains internal and external rotation without heavy load.",
        instructions: [
            "Sit on the floor with your knees bent and feet flat, somewhat wide apart.",
            "Drop both knees down to one side, forming roughly 90-degree angles in both legs.",
            "Without fully sliding your feet, flip both knees up and entirely over to the other side.",
            "Keep your torso as upright as comfortably possible."
        ],
        targetAreas: ["hips", "glutes", "deep rotators"],
        cues: [
            "Sit tall before switching side to side.",
            "Rotate from the hips instead of collapsing through the spine.",
        ],
        benefits: ["great hip prep", "useful for lifters who feel stuck in squat and split-squat positions"],
        commonMistakes: [
            "Leaning back and losing the hip challenge.",
            "Forcing the knees down instead of earning the range.",
        ],
        regression: "Support the hands behind the torso.",
        progression: "Hover the feet during transitions to add control.",
        equipment: ["None"],
    },
    "wrist-extensor": {
        id: "wrist-extensor",
        name: "Wrist Extensor Stretch",
        duration: 25,
        sides: 2,
        description: "A simple forearm and wrist opener for lifters who spend a lot of time gripping bars, handles, and keyboards.",
        instructions: [
            "Extend one arm straight out in front of you.",
            "Flex the wrist so your fingers point downward.",
            "Use your opposite hand to gently push on the back of your hand to intensify the stretch.",
            "Hold steady, feeling tension over the top of the forearm."
        ],
        targetAreas: ["forearms", "wrists"],
        cues: [
            "Straighten the elbow and gently flex the wrist until the forearm lights up.",
            "Keep the shoulder relaxed while the hand moves.",
        ],
        benefits: ["helps after lots of curls, carries, and typing", "pairs well with desk-reset sessions"],
        commonMistakes: [
            "Pulling too hard into the wrist joint.",
            "Bending the elbow and losing the forearm stretch.",
        ],
        regression: "Use a smaller range and shorter hold.",
        progression: "Add light finger extension between holds.",
        equipment: ["None"],
    },
    "deep-squat-pry": {
        id: "deep-squat-pry",
        name: "Deep Squat Pry",
        duration: 35,
        description: "Sit into a supported deep squat and gently pry the hips and ankles open.",
        instructions: [
            "Stand with your feet slightly wider than shoulder-width, toes turned out slightly.",
            "Squat down as deeply as you can while keeping your heels flat.",
            "Press your elbows against your inner knees or upper thighs to open the hips.",
            "Shift your weight slightly side-to-side to loosen up the ankles and hips."
        ],
        targetAreas: ["ankles", "hips", "adductors"],
        cues: [
            "Use a counterbalance or support if needed so you can stay tall.",
            "Shift gently side to side to explore the hips without forcing them.",
        ],
        benefits: ["excellent squat prep", "helps if machine-free leg work demands more bottom-end mobility"],
        commonMistakes: [
            "Falling into lumbar rounding and hanging out there.",
            "Trying to sit all the way down before the ankles and hips are ready.",
        ],
        regression: "Hold onto a sturdy support or elevate the heels.",
        progression: "Add a small reach or thoracic rotation in the bottom.",
        equipment: ["Wall", "Counterweight optional"],
    },
    "neck-glides": {
        id: "neck-glides",
        name: "Neck Glides",
        duration: 25,
        description: "Gentle neck mobility to undo screen-time stiffness without cranking the cervical spine.",
        instructions: [
            "Sit or stand completely upright in a relaxed posture.",
            "Slowly drop your left ear toward your left shoulder.",
            "Carefully glide or slowly roll the head toward the front or to the right side.",
            "Apply soft, minimal pressure with a hand only if comfortable, otherwise strictly active."
        ],
        targetAreas: ["neck", "upper traps"],
        cues: [
            "Move slowly and stay below pain or pinching sensations.",
            "Think of lengthening through the crown of the head as you move.",
        ],
        benefits: ["good for desk reset days", "helps remove excess tension before upper-body training"],
        commonMistakes: [
            "Rolling aggressively through the neck.",
            "Forcing end ranges instead of staying controlled.",
        ],
        regression: "Perform only tiny nods and side glides.",
        progression: "Pair with slow shoulder blade circles.",
        equipment: ["None"],
    },

    // NEW DYNAMIC PRE-WORKOUT STRETCHES
    "arm-circles": {
        id: "arm-circles",
        name: "Arm Circles",
        duration: 30,
        description: "Dynamic shoulder warmth and mobility.",
        instructions: [
            "Stand tall with arms extended outward at shoulder height.",
            "Start making small forward circles with your arms.",
            "Gradually increase the size of the circles until you're making full sweeps.",
            "Halfway through the duration, reverse direction to backward circles."
        ],
        targetAreas: ["shoulders", "rotator cuff"],
        cues: ["Start small and slow", "Keep the core braced so only the arms move"],
        benefits: ["Warms up the shoulder joint capsules", "Good for pre-bench press"],
        commonMistakes: ["Using momentum from the torso", "Rushing the motion"],
        equipment: ["None"]
    },
    "leg-swings-forward": {
        id: "leg-swings-forward",
        name: "Forward Leg Swings",
        duration: 30,
        sides: 2,
        description: "Dynamic hamstring and hip flexor stretch, ideal before squats.",
        instructions: [
            "Stand beside a wall or rack and hold it with one hand for balance.",
            "Keeping your working leg reasonably straight, swing it solidly forward and upward.",
            "Allow gravity to pull it down and swing it forcefully back behind you.",
            "Maintain a steady, continuous rhythm."
        ],
        targetAreas: ["hamstrings", "hip flexors", "glutes"],
        cues: ["Keep the torso fully upright", "Don't force the range, let momentum assist you"],
        benefits: ["Opens up tight hamstrings pre-workout", "Warms up the hip joint dynamically"],
        commonMistakes: ["Rounding the low back heavily as the leg comes up"],
        equipment: ["Wall"]
    },
    "leg-swings-lateral": {
        id: "leg-swings-lateral",
        name: "Lateral Leg Swings",
        duration: 30,
        sides: 2,
        description: "Dynamic adductor and abductor stretch for lateral hip opening.",
        instructions: [
            "Face a wall or post, holding it lightly with both hands.",
            "Swing one leg directly out to the side as high as it will comfortably go.",
            "Allow the leg to swing naturally back across the front of your standing leg.",
            "Keep the motion fluid rather than jerky."
        ],
        targetAreas: ["adductors", "abductors", "hips"],
        cues: ["Keep toes pointing straight ahead, not externally rotated", "Keep your torso from swaying"],
        benefits: ["Improves lateral hip mobility", "Enhances clean squat mechanics in the hole"],
        commonMistakes: ["Excessively rotating the hips or lower back"],
        equipment: ["Wall"]
    },
    "walking-lunges-reach": {
        id: "walking-lunges-reach",
        name: "Walking Lunge with Reach",
        duration: 45,
        description: "Dynamic lunge to stretch the hip flexors while mobilizing the thoracic spine.",
        instructions: [
            "Take an exaggerated lunge step forward and drop your rear knee close to the floor.",
            "Simultaneously reach both arms straight up and lean the upper back slightly backward.",
            "Drive out of the lunge into the next step forward on the opposite leg.",
            "Repeat alternating sides smoothly."
        ],
        targetAreas: ["hip flexors", "quads", "lats", "core"],
        cues: ["Sink confidently into the bottom lunge position", "Extend upward strongly through the shoulders"],
        benefits: ["Complex full-body warmup", "Engages the core structure while heavily opening hips"],
        commonMistakes: ["Arching the lower back instead of the upper spine", "Front knee caving inward"],
        equipment: ["None"]
    },
    "inchworms": {
        id: "inchworms",
        name: "Inchworms",
        duration: 40,
        description: "Dynamic hamstring stretch and powerful core and shoulder activation.",
        instructions: [
            "From a standing position, hinge downward and touch your hands to the floor in front of you.",
            "Slowly walk your hands forward until you reach a straight-arm plank.",
            "Optional: Perform one pushup.",
            "Walk your toes forward toward your hands in tiny steps, keeping your legs as straight as possible."
        ],
        targetAreas: ["hamstrings", "calves", "shoulders", "core"],
        cues: ["Keep legs straight to maximize hamstring loading", "Brace your core tight during the plank"],
        benefits: ["Stretches the entire posterior chain while prepping the anterior line"],
        commonMistakes: ["Bending the knees sharply to reach the floor", "Letting the lower back sag in plank position"],
        equipment: ["None"]
    },

    // NEW BODYWEIGHT MOVEMENTS (PRIMERS & FINISHERS)
    "burpees": {
        id: "burpees",
        name: "Burpees",
        duration: 45,
        description: "A full-body explosive movement to spike heart rate and burn fat.",
        instructions: [
            "Start in a standing position.",
            "Drop into a squat position and place your hands on the ground.",
            "Kick your feet back into a plank position, keeping your core tight.",
            "Quickly jump your feet back to the squat position.",
            "Stand up and jump explosively with your hands reaching overhead."
        ],
        targetAreas: ["full body", "cardio", "shoulders", "legs"],
        cues: ["Stay light on your feet", "Keep the core braced during the plank kick-out"],
        benefits: ["Spikes heart rate", "Builds explosive power"],
        commonMistakes: ["Letting the lower back sag in the plank", "Skipping the jump at the top"],
        equipment: ["None"]
    },
    "planks": {
        id: "planks",
        name: "Plank Hold",
        duration: 60,
        description: "An isometric hold to build core stability and endurance.",
        instructions: [
            "Start on your forearms and toes, with elbows directly under shoulders.",
            "Keep your body in a straight line from head to heels.",
            "Squeeze your glutes and brace your core tightly.",
            "Breathe steadily while holding the position."
        ],
        targetAreas: ["core", "shoulders", "glutes"],
        cues: ["Pull your belly button toward your spine", "Push the floor away with your forearms"],
        benefits: ["Improves core stability", "Protects the lower back"],
        commonMistakes: ["Hips dipping too low", "Hips piked too high in the air"],
        equipment: ["None"]
    },
    "bird-dogs": {
        id: "bird-dogs",
        name: "Bird-Dogs",
        duration: 45,
        description: "A core and spinal stabilization movement.",
        instructions: [
            "Start on all fours with hands under shoulders and knees under hips.",
            "Simultaneously extend your right arm forward and your left leg backward.",
            "Keep your back flat and your hips square to the ground.",
            "Hold for a second, then return to the start and switch sides."
        ],
        targetAreas: ["core", "lower back", "glutes"],
        cues: ["Reach long, not just high", "Keep your lower back from arching"],
        benefits: ["Improves spinal stability", "Builds cross-body coordination"],
        commonMistakes: ["Arching the lower back", "Rotating the hips toward the ceiling"],
        equipment: ["None"]
    },
    "mountain-climbers": {
        id: "mountain-climbers",
        name: "Mountain Climbers",
        duration: 45,
        description: "A high-intensity core and cardio movement.",
        instructions: [
            "Start in a straight-arm plank position.",
            "Drive one knee forward toward your chest.",
            "Quickly switch legs, driving the other knee forward.",
            "Keep your hips down and move securely but quickly."
        ],
        targetAreas: ["core", "shoulders", "cardio"],
        cues: ["Keep your shoulders stacked over your wrists", "Brace your core so your hips don't bounce"],
        benefits: ["Shreds the core", "Drives up the heart rate quickly"],
        commonMistakes: ["Bouncing the hips too high", "Looking back at the feet instead of slightly forward"],
        equipment: ["None"]
    },
    "jump-squats": {
        id: "jump-squats",
        name: "Jump Squats",
        duration: 45,
        description: "An explosive lower body movement for power and burnout.",
        instructions: [
            "Stand with your feet shoulder-width apart.",
            "Lower your hips into a squat.",
            "Explode upward, jumping as high as you can.",
            "Land softly with bent knees and go straight into the next repetition."
        ],
        targetAreas: ["quads", "glutes", "cardio"],
        cues: ["Use your arms for momentum", "Land softly to protect the joints"],
        benefits: ["Builds lower body power", "Great for burning out the legs"],
        commonMistakes: ["Landing with stiff knees", "Letting the knees cave inward"],
        equipment: ["None"]
    },
    "pushups": {
        id: "pushups",
        name: "Push-ups",
        duration: 30,
        description: "A classic upper body pushing movement.",
        instructions: [
            "Start in a high plank position.",
            "Lower your body until your chest nearly touches the floor.",
            "Keep your elbows tucked at roughly 45 degrees.",
            "Push back up to the starting position."
        ],
        targetAreas: ["chest", "shoulders", "triceps"],
        cues: ["Keep your body in a straight line", "Squeeze your glutes"],
        benefits: ["Warms up the pressing muscles", "Builds endurance"],
        commonMistakes: ["Flaring the elbows out 90 degrees", "Sagging the hips"],
        equipment: ["None"]
    },
    "high-knees": {
        id: "high-knees",
        name: "High Knees",
        duration: 45,
        description: "A rapid standing cardio drill.",
        instructions: [
            "Stand tall with your feet about hip-width apart.",
            "Quickly drive one knee up toward your chest.",
            "Switch legs quickly, as if running in place.",
            "Pump your arms to maintain rhythm."
        ],
        targetAreas: ["cardio", "hip flexors", "calves"],
        cues: ["Stay tall, don't lean backward", "Land lightly on the balls of your feet"],
        benefits: ["Maximizes heart rate", "Activates hip flexors"],
        commonMistakes: ["Barely lifting the knees", "Slamming the heels down"],
        equipment: ["None"]
    },
    "hollow-body": {
        id: "hollow-body",
        name: "Hollow Body Hold",
        duration: 45,
        description: "An advanced gymnastic core hold.",
        instructions: [
            "Lie flat on your back.",
            "Press your lower back firmly into the ground.",
            "Lift your shoulders and legs slightly off the floor.",
            "Extend your arms overhead and point your toes."
        ],
        targetAreas: ["core", "abs"],
        cues: ["Your lower back must not leave the floor", "Squeeze your quads and glutes"],
        benefits: ["Builds elite core tension", "Transfers well to heavy lifts"],
        commonMistakes: ["Arching the lower back", "Tucking the chin excessively into the chest"],
        equipment: ["None"]
    },
    "glute-bridges": {
        id: "glute-bridges",
        name: "Glute Bridges",
        duration: 40,
        description: "A foundational exercise to activate the glutes and protect the back.",
        instructions: [
            "Lie on your back with your knees bent and feet flat on the floor.",
            "Squeeze your glutes and push through your heels to lift your hips.",
            "Ensure a straight line from your knees to your shoulders at the top.",
            "Lower back down with control."
        ],
        targetAreas: ["glutes", "hamstrings", "lower back"],
        cues: ["Don't overextend your lower back at the top", "Drive through the heels"],
        benefits: ["Wakes up sleepy glutes", "Great primer for squats and deadlifts"],
        commonMistakes: ["Pushing through the toes", "Using the lower back instead of the glutes"],
        equipment: ["None"]
    }
};

const stretch = (id: keyof typeof STRETCH_LIBRARY) => STRETCH_LIBRARY[id];

export const StretchingPrograms: StretchingProgram[] = [
    {
        id: "pre-workout-primer",
        name: "Pre-Workout Primer",
        focusAreas: ["dynamic mobility", "hips", "shoulders", "core"],
        bestFor: ["before heavy lifting", "warming up the nervous system", "increasing blood flow"],
        difficulty: "Moderate",
        equipment: ["None"],
        stretches: [
            stretch("arm-circles"),
            stretch("leg-swings-forward"),
            stretch("leg-swings-lateral"),
            stretch("inchworms"),
            stretch("walking-lunges-reach"),
            stretch("deep-squat-pry"),
            stretch("worlds-greatest-stretch")
        ]
    },
    {
        id: "upper-body-stretch",
        name: "Upper Body Mobility",
        focusAreas: ["chest", "shoulders", "lats", "thoracic spine"],
        bestFor: ["post push day", "desk posture reset", "overhead comfort"],
        difficulty: "Easy",
        equipment: ["Mostly none", "Wall / door frame optional"],
        stretches: [
            stretch("cross-body-shoulder"),
            stretch("overhead-tricep"),
            stretch("doorway-chest"),
            stretch("thread-the-needle"),
            stretch("lat-prayer"),
            stretch("wall-slides"),
        ],
    },
    {
        id: "lower-body-stretch",
        name: "Lower Body Flexibility",
        focusAreas: ["hamstrings", "quads", "hips", "ankles", "calves"],
        bestFor: ["post leg day", "squat recovery", "tight hips from sitting"],
        difficulty: "Moderate",
        equipment: ["Mostly none", "Wall optional"],
        stretches: [
            stretch("hamstring-fold"),
            stretch("couch-stretch"),
            stretch("pigeon-pose"),
            stretch("adductor-rock-backs"),
            stretch("ankle-dorsiflexion-rocks"),
            stretch("calf-wall-stretch"),
        ],
    },
    {
        id: "full-body-stretch",
        name: "Full Body Flow",
        focusAreas: ["spine", "hips", "shoulders", "hamstrings"],
        bestFor: ["active recovery day", "morning reset", "general mobility work"],
        difficulty: "Easy",
        equipment: ["None"],
        stretches: [
            stretch("cat-cow"),
            stretch("worlds-greatest-stretch"),
            stretch("downward-dog"),
            stretch("childs-pose"),
            stretch("cobra-stretch"),
            stretch("ninety-ninety-switches"),
        ],
    },
    {
        id: "desk-reset-flow",
        name: "Desk Reset Flow",
        focusAreas: ["neck", "upper back", "wrists", "hips"],
        bestFor: ["screen-heavy days", "travel recovery", "quick midday reset"],
        difficulty: "Easy",
        equipment: ["Wall optional"],
        stretches: [
            stretch("neck-glides"),
            stretch("wall-slides"),
            stretch("doorway-chest"),
            stretch("thread-the-needle"),
            stretch("wrist-extensor"),
            stretch("childs-pose"),
        ],
    },
    {
        id: "squat-depth-reset",
        name: "Squat Depth Reset",
        focusAreas: ["ankles", "hips", "adductors", "quads"],
        bestFor: ["before leg sessions", "machine-free squat training", "mobility bottlenecks"],
        difficulty: "Focused",
        equipment: ["Wall optional", "Counterweight optional"],
        stretches: [
            stretch("deep-squat-pry"),
            stretch("ankle-dorsiflexion-rocks"),
            stretch("adductor-rock-backs"),
            stretch("couch-stretch"),
            stretch("calf-wall-stretch"),
            stretch("ninety-ninety-switches"),
        ],
    },
    {
        id: "pre-workout-push",
        name: "Pre-Workout: Push",
        focusAreas: ["shoulders", "chest", "thoracic spine"],
        bestFor: ["before heavy pressing", "warming up the shoulder capsule"],
        difficulty: "Moderate",
        equipment: ["None"],
        stretches: [
            stretch("arm-circles"),
            stretch("doorway-chest"), // dynamic use is good
            stretch("worlds-greatest-stretch"),
            stretch("wall-slides")
        ]
    },
    {
        id: "post-workout-push",
        name: "Post-Workout: Push",
        focusAreas: ["chest", "front delts", "triceps"],
        bestFor: ["after pressing sessions", "restoring shoulder reach"],
        difficulty: "Easy",
        equipment: ["Wall / door frame"],
        stretches: [
            stretch("cross-body-shoulder"),
            stretch("overhead-tricep"),
            stretch("doorway-chest"),
            stretch("wall-slides")
        ]
    },
    {
        id: "pre-workout-pull",
        name: "Pre-Workout: Pull",
        focusAreas: ["upper back", "lats", "thoracic spine"],
        bestFor: ["before heavy rows and pullups", "activating the mid back"],
        difficulty: "Moderate",
        equipment: ["None"],
        stretches: [
            stretch("arm-circles"),
            stretch("cat-cow"),
            stretch("thread-the-needle"),
            stretch("worlds-greatest-stretch")
        ]
    },
    {
        id: "post-workout-pull",
        name: "Post-Workout: Pull",
        focusAreas: ["lats", "mid back", "biceps", "neck"],
        bestFor: ["after dragging sessions", "easing lat tightness"],
        difficulty: "Easy",
        equipment: ["Bench/Chair"],
        stretches: [
            stretch("lat-prayer"),
            stretch("thread-the-needle"),
            stretch("childs-pose"),
            stretch("neck-glides")
        ]
    },
    {
        id: "pre-workout-legs",
        name: "Pre-Workout: Legs",
        focusAreas: ["hips", "ankles", "hamstrings", "groin"],
        bestFor: ["before squatting", "warming up the hips"],
        difficulty: "Moderate",
        equipment: ["Wall"],
        stretches: [
            stretch("leg-swings-forward"),
            stretch("leg-swings-lateral"),
            stretch("walking-lunges-reach"),
            stretch("inchworms"),
            stretch("deep-squat-pry"),
            stretch("ankle-dorsiflexion-rocks")
        ]
    },
    {
        id: "post-workout-legs",
        name: "Post-Workout: Legs",
        focusAreas: ["quads", "hamstrings", "glutes", "calves"],
        bestFor: ["after heavy squats and deadlifts", "restoring length in the lower body"],
        difficulty: "Moderate",
        equipment: ["Wall", "Bench"],
        stretches: [
            stretch("hamstring-fold"),
            stretch("pigeon-pose"),
            stretch("couch-stretch"),
            stretch("calf-wall-stretch")
        ]
    },

    // NEW PRIMERS (WARM-UPS)
    {
        id: "upper-body-primer",
        name: "Upper Body Primer",
        focusAreas: ["shoulders", "chest", "core", "cardio"],
        bestFor: ["before heavy pushing", "waking up the nervous system"],
        difficulty: "Moderate",
        equipment: ["None"],
        stretches: [
            stretch("arm-circles"),
            stretch("inchworms"),
            stretch("pushups"),
            stretch("planks")
        ]
    },
    {
        id: "heavy-squat-primer",
        name: "Heavy Squat Primer",
        focusAreas: ["hips", "glutes", "core", "ankles"],
        bestFor: ["before heavy leg days", "protecting the joints"],
        difficulty: "Moderate",
        equipment: ["None"],
        stretches: [
            stretch("leg-swings-forward"),
            stretch("glute-bridges"),
            stretch("bird-dogs"),
            stretch("deep-squat-pry")
        ]
    },

    // NEW FINISHERS (BURNOUTS)
    {
        id: "core-annihilator",
        name: "Core Annihilator",
        focusAreas: ["core", "abs", "cardio"],
        bestFor: ["after an upper body workout", "shredding the core"],
        difficulty: "Focused",
        equipment: ["None"],
        stretches: [
            stretch("mountain-climbers"),
            stretch("hollow-body"),
            stretch("planks"),
            stretch("bird-dogs")
        ]
    },
    {
        id: "leg-day-executioner",
        name: "Leg Day Executioner",
        focusAreas: ["quads", "glutes", "cardio", "full body"],
        bestFor: ["emptying the tank after leg day", "burning fat"],
        difficulty: "Focused",
        equipment: ["None"],
        stretches: [
            stretch("jump-squats"),
            stretch("high-knees"),
            stretch("burpees"),
            stretch("planks")
        ]
    }
];

const PRIMER_PROGRAM_IDS = new Set([
    "pre-workout-primer",
    "pre-workout-push",
    "pre-workout-pull",
    "pre-workout-legs",
    "upper-body-primer",
    "heavy-squat-primer",
]);

const FINISHER_PROGRAM_IDS = new Set([
    "core-annihilator",
    "leg-day-executioner",
]);

export const PrimerPrograms = StretchingPrograms.filter((program) =>
    PRIMER_PROGRAM_IDS.has(program.id)
);

export const FinisherPrograms = StretchingPrograms.filter((program) =>
    FINISHER_PROGRAM_IDS.has(program.id)
);

export const StretchPrograms = StretchingPrograms.filter(
    (program) => !PRIMER_PROGRAM_IDS.has(program.id) && !FINISHER_PROGRAM_IDS.has(program.id)
);
