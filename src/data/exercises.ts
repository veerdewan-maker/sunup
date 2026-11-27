import type { Equip, Exercise, Pattern } from '../types';

// [id, name, pattern, muscle, needs (space separated), compound, lower body, how-to, timed?]
// Order inside each pattern is the order of preference when building a plan.
type Row = [string, string, Pattern, string, string, 0 | 1, 0 | 1, string, 1?];

const rows: Row[] = [
  // Squat
  ['back-squat', 'Back Squat', 'squat', 'Quads', 'bb rack', 1, 1, 'Bar across your upper back, feet shoulder width. Sit down and back until thighs are at least parallel, then drive up through the whole foot.'],
  ['front-squat', 'Front Squat', 'squat', 'Quads', 'bb rack', 1, 1, 'Bar rests on the front of your shoulders, elbows high. Stay upright, squat to depth, and stand up without letting the elbows drop.'],
  ['leg-press', 'Leg Press', 'squat', 'Quads', 'machine', 1, 1, 'Feet shoulder width on the platform. Lower until knees are about 90 degrees, then press without locking your knees hard.'],
  ['hack-squat', 'Hack Squat', 'squat', 'Quads', 'machine', 1, 1, 'Back flat on the pad, feet mid platform. Lower under control to depth and push back up.'],
  ['goblet-squat', 'Goblet Squat', 'squat', 'Quads', 'db', 1, 1, 'Hold one dumbbell against your chest. Squat between your knees keeping your chest tall, then stand.'],
  ['kb-goblet-squat', 'Kettlebell Goblet Squat', 'squat', 'Quads', 'kb', 1, 1, 'Hold the kettlebell by the horns at your chest. Squat deep with an upright torso and stand.'],
  ['db-squat', 'Dumbbell Squat', 'squat', 'Quads', 'db', 1, 1, 'Dumbbells at your sides. Squat down as if sitting on a chair, then stand tall.'],
  ['band-squat', 'Banded Squat', 'squat', 'Quads', 'band', 1, 1, 'Stand on the band and hold it at your shoulders. Squat to depth and stand against the band tension.'],
  ['bw-squat', 'Bodyweight Squat', 'squat', 'Quads', '', 1, 1, 'Feet shoulder width, arms forward. Sit down until thighs are parallel and stand up.'],
  ['tempo-squat', 'Tempo Squat', 'squat', 'Quads', '', 1, 1, 'A bodyweight squat taking 3 seconds down, a 1 second pause at the bottom, then stand.'],
  // Hinge
  ['deadlift', 'Deadlift', 'hinge', 'Hamstrings and back', 'bb', 1, 1, 'Bar over mid foot, flat back, grip just outside your legs. Push the floor away and stand up, then lower with control.'],
  ['rdl', 'Romanian Deadlift', 'hinge', 'Hamstrings', 'bb', 1, 1, 'From standing, push your hips back with soft knees and slide the bar down your thighs to mid shin, then squeeze your glutes to stand.'],
  ['db-rdl', 'Dumbbell Romanian Deadlift', 'hinge', 'Hamstrings', 'db', 1, 1, 'Dumbbells in front of your thighs. Hinge at the hips with a flat back until you feel your hamstrings stretch, then stand.'],
  ['kb-swing', 'Kettlebell Swing', 'hinge', 'Glutes and hamstrings', 'kb', 1, 1, 'Hike the bell back between your legs and snap your hips forward so it floats to chest height. Arms stay relaxed.'],
  ['kb-deadlift', 'Kettlebell Deadlift', 'hinge', 'Hamstrings', 'kb', 1, 1, 'Bell between your feet. Hinge down with a flat back, grip it, and stand tall.'],
  ['back-extension', 'Back Extension', 'hinge', 'Lower back and glutes', 'machine', 0, 1, 'Hips on the pad. Lower your torso with a flat back and raise until your body is straight.'],
  ['band-good-morning', 'Banded Good Morning', 'hinge', 'Hamstrings', 'band', 1, 1, 'Band under your feet and over your neck. Hinge forward with a flat back and stand up.'],
  ['sl-rdl', 'Single-Leg Romanian Deadlift', 'hinge', 'Hamstrings', '', 1, 1, 'Balance on one leg, hinge forward as the other leg reaches back, then return to standing. Reps are per side.'],
  ['bw-good-morning', 'Good Morning', 'hinge', 'Hamstrings', '', 1, 1, 'Hands behind your head. Push your hips back with a flat back until your torso is nearly parallel, then stand.'],
  // Lunge
  ['bulgarian-split-squat', 'Bulgarian Split Squat', 'lunge', 'Quads and glutes', 'db bench', 1, 1, 'Rear foot on a bench, dumbbells at your sides. Lower straight down and drive up through the front foot. Reps are per side.'],
  ['db-walking-lunge', 'Dumbbell Walking Lunge', 'lunge', 'Quads and glutes', 'db', 1, 1, 'Step forward into a lunge, back knee near the floor, then step through into the next. Reps are per side.'],
  ['bb-reverse-lunge', 'Barbell Reverse Lunge', 'lunge', 'Quads and glutes', 'bb rack', 1, 1, 'Bar on your back. Step back into a lunge and push through the front foot to return. Reps are per side.'],
  ['db-step-up', 'Dumbbell Step-Up', 'lunge', 'Quads and glutes', 'db bench', 1, 1, 'Step onto a bench with one foot and stand up fully, then lower slowly. Reps are per side.'],
  ['kb-lunge', 'Kettlebell Reverse Lunge', 'lunge', 'Quads and glutes', 'kb', 1, 1, 'Hold the bell at your chest. Step back into a lunge and return. Reps are per side.'],
  ['reverse-lunge', 'Reverse Lunge', 'lunge', 'Quads and glutes', '', 1, 1, 'Step back, lower until both knees are about 90 degrees, and push back up. Reps are per side.'],
  ['split-squat', 'Split Squat', 'lunge', 'Quads and glutes', '', 1, 1, 'Staggered stance. Lower straight down until the back knee nearly touches, then stand. Reps are per side.'],
  ['step-up', 'Step-Up', 'lunge', 'Quads and glutes', '', 1, 1, 'Step onto a sturdy chair or step and stand tall, then lower slowly. Reps are per side.'],
  // Horizontal push
  ['bench-press', 'Barbell Bench Press', 'hpush', 'Chest', 'bb bench rack', 1, 0, 'Shoulder blades pinched, feet planted. Lower the bar to mid chest and press up over your shoulders.'],
  ['db-bench-press', 'Dumbbell Bench Press', 'hpush', 'Chest', 'db bench', 1, 0, 'Lower the dumbbells to the sides of your chest with elbows at about 45 degrees and press up.'],
  ['incline-bench-press', 'Incline Barbell Bench Press', 'hpush', 'Upper chest', 'bb bench rack', 1, 0, 'Bench at 30 to 45 degrees. Lower the bar to your upper chest and press.'],
  ['incline-db-press', 'Incline Dumbbell Press', 'hpush', 'Upper chest', 'db bench', 1, 0, 'Bench at 30 to 45 degrees. Lower the dumbbells beside your upper chest and press up.'],
  ['machine-chest-press', 'Machine Chest Press', 'hpush', 'Chest', 'machine', 1, 0, 'Handles at mid chest height. Press forward and return under control.'],
  ['db-floor-press', 'Dumbbell Floor Press', 'hpush', 'Chest', 'db', 1, 0, 'Lie on the floor, lower the dumbbells until your upper arms touch the ground, and press.'],
  ['kb-floor-press', 'Kettlebell Floor Press', 'hpush', 'Chest', 'kb', 1, 0, 'Lie on the floor and press the kettlebell from chest level to straight arms. Reps are per side.'],
  ['band-push-up', 'Banded Push-Up', 'hpush', 'Chest', 'band', 1, 0, 'Loop the band across your back and under your hands, then do push-ups against it.'],
  ['push-up', 'Push-Up', 'hpush', 'Chest', '', 1, 0, 'Hands under shoulders, body in a straight line. Lower your chest to the floor and press up. Use your knees if needed.'],
  ['decline-push-up', 'Decline Push-Up', 'hpush', 'Upper chest', '', 1, 0, 'Feet on a chair, hands on the floor. Lower your chest and press up, keeping your body straight.'],
  // Vertical push
  ['ohp', 'Overhead Press', 'vpush', 'Shoulders', 'bb', 1, 0, 'Bar at your collarbone, squeeze your glutes. Press straight up and finish with the bar over mid foot.'],
  ['db-shoulder-press', 'Dumbbell Shoulder Press', 'vpush', 'Shoulders', 'db', 1, 0, 'Dumbbells at ear height. Press overhead until your arms are straight and lower with control.'],
  ['machine-shoulder-press', 'Machine Shoulder Press', 'vpush', 'Shoulders', 'machine', 1, 0, 'Handles at shoulder height. Press up and lower slowly.'],
  ['arnold-press', 'Arnold Press', 'vpush', 'Shoulders', 'db', 1, 0, 'Start with palms facing you at chin height and rotate them forward as you press overhead.'],
  ['kb-press', 'Kettlebell Press', 'vpush', 'Shoulders', 'kb', 1, 0, 'Bell racked at your shoulder. Press overhead and lower back to the rack. Reps are per side.'],
  ['band-ohp', 'Banded Overhead Press', 'vpush', 'Shoulders', 'band', 1, 0, 'Stand on the band, hands at your shoulders, and press overhead.'],
  ['pike-push-up', 'Pike Push-Up', 'vpush', 'Shoulders', '', 1, 0, 'Hips high in an upside-down V. Lower the top of your head toward the floor and press up.'],
  ['elevated-pike-push-up', 'Feet-Elevated Pike Push-Up', 'vpush', 'Shoulders', '', 1, 0, 'Pike push-up with your feet on a chair to put more weight on your shoulders.'],
  // Horizontal pull
  ['bb-row', 'Barbell Row', 'hpull', 'Back', 'bb', 1, 0, 'Hinge to about 45 degrees with a flat back. Pull the bar to your lower ribs and lower with control.'],
  ['db-row', 'Dumbbell Row', 'hpull', 'Back', 'db', 1, 0, 'One hand on a support, flat back. Pull the dumbbell to your hip and lower. Reps are per side.'],
  ['cable-row', 'Seated Cable Row', 'hpull', 'Back', 'cable', 1, 0, 'Sit tall, pull the handle to your stomach, squeeze your shoulder blades, and return slowly.'],
  ['chest-supported-row', 'Chest-Supported Dumbbell Row', 'hpull', 'Back', 'db bench', 1, 0, 'Chest on an incline bench. Row both dumbbells to your hips and lower.'],
  ['machine-row', 'Machine Row', 'hpull', 'Back', 'machine', 1, 0, 'Chest on the pad. Pull the handles back, squeeze, and return.'],
  ['kb-row', 'Kettlebell Row', 'hpull', 'Back', 'kb', 1, 0, 'Hinge forward with a flat back and row the bell to your hip. Reps are per side.'],
  ['band-row', 'Banded Row', 'hpull', 'Back', 'band', 1, 0, 'Anchor the band at chest height or around your feet. Pull your elbows back and squeeze.'],
  ['inverted-row', 'Inverted Row', 'hpull', 'Back', 'bb rack', 1, 0, 'Set a bar at waist height, hang under it with a straight body, and pull your chest to the bar.'],
  ['towel-row', 'Towel Door Row', 'hpull', 'Back', '', 1, 0, 'Loop a towel around a sturdy door handle, lean back with straight arms, and pull your chest to your hands.'],
  ['prone-w-raise', 'Prone W Raise', 'hpull', 'Upper back', '', 0, 0, 'Lie face down, lift your chest slightly, and pull your elbows back into a W. Squeeze for a second.'],
  // Vertical pull
  ['pull-up', 'Pull-Up', 'vpull', 'Lats', 'pullup', 1, 0, 'Overhand grip, start from a dead hang. Pull your chin over the bar and lower all the way.'],
  ['lat-pulldown', 'Lat Pulldown', 'vpull', 'Lats', 'cable', 1, 0, 'Grip just wider than your shoulders. Pull the bar to your upper chest and return slowly.'],
  ['chin-up', 'Chin-Up', 'vpull', 'Lats and biceps', 'pullup', 1, 0, 'Underhand grip. Pull your chin over the bar and lower under control.'],
  ['assisted-pull-up', 'Assisted Pull-Up', 'vpull', 'Lats', 'machine', 1, 0, 'Use the assisted machine. Pull your chin over the handles and lower all the way.'],
  ['band-pulldown', 'Banded Lat Pulldown', 'vpull', 'Lats', 'band', 1, 0, 'Anchor the band overhead, kneel, and pull your elbows down to your sides.'],
  ['db-pullover', 'Dumbbell Pullover', 'vpull', 'Lats', 'db', 0, 0, 'Lie down holding one dumbbell over your chest. Lower it behind your head with slightly bent arms and pull back.'],
  ['kb-pullover', 'Kettlebell Pullover', 'vpull', 'Lats', 'kb', 0, 0, 'Lie down, hold the bell over your chest, lower it behind your head, and pull back over.'],
  ['floor-pulldown', 'Prone Lat Pulldown', 'vpull', 'Lats', '', 0, 0, 'Lie face down with arms overhead. Lift your chest and pull your elbows down to your ribs, then reach forward again.'],
  // Chest isolation
  ['cable-fly', 'Cable Fly', 'chestIso', 'Chest', 'cable', 0, 0, 'Arms slightly bent, bring the handles together in front of your chest and open back to a stretch.'],
  ['pec-deck', 'Pec Deck', 'chestIso', 'Chest', 'machine', 0, 0, 'Bring the pads or handles together in front of you and return slowly.'],
  ['db-fly', 'Dumbbell Fly', 'chestIso', 'Chest', 'db bench', 0, 0, 'Lower the dumbbells out to your sides with soft elbows and squeeze them back together.'],
  ['band-fly', 'Banded Fly', 'chestIso', 'Chest', 'band', 0, 0, 'Anchor the band behind you and bring your hands together in front of your chest.'],
  ['wide-push-up', 'Wide Push-Up', 'chestIso', 'Chest', '', 0, 0, 'Push-up with hands well outside your shoulders to stretch the chest.'],
  // Side delts
  ['db-lateral-raise', 'Dumbbell Lateral Raise', 'latRaise', 'Side delts', 'db', 0, 0, 'Raise the dumbbells out to your sides to shoulder height with a slight elbow bend and lower slowly.'],
  ['cable-lateral-raise', 'Cable Lateral Raise', 'latRaise', 'Side delts', 'cable', 0, 0, 'Cable at the lowest setting. Raise your arm out to the side to shoulder height. Reps are per side.'],
  ['machine-lateral-raise', 'Machine Lateral Raise', 'latRaise', 'Side delts', 'machine', 0, 0, 'Elbows against the pads. Raise to shoulder height and lower.'],
  ['band-lateral-raise', 'Banded Lateral Raise', 'latRaise', 'Side delts', 'band', 0, 0, 'Stand on the band and raise your arms to the sides to shoulder height.'],
  // Rear delts
  ['face-pull', 'Face Pull', 'rearDelt', 'Rear delts', 'cable', 0, 0, 'Rope at face height. Pull toward your eyes with elbows high and rotate your hands back.'],
  ['reverse-pec-deck', 'Reverse Pec Deck', 'rearDelt', 'Rear delts', 'machine', 0, 0, 'Facing the pad, open your arms out and back, then return.'],
  ['db-reverse-fly', 'Dumbbell Reverse Fly', 'rearDelt', 'Rear delts', 'db', 0, 0, 'Hinge forward and raise the dumbbells out to your sides, leading with your elbows.'],
  ['band-pull-apart', 'Band Pull-Apart', 'rearDelt', 'Rear delts', 'band', 0, 0, 'Hold the band at chest height with straight arms and pull it apart to your chest.'],
  ['prone-y-raise', 'Prone Y Raise', 'rearDelt', 'Rear delts', '', 0, 0, 'Lie face down and lift your arms into a Y with thumbs up. Hold for a second at the top.'],
  // Biceps
  ['bb-curl', 'Barbell Curl', 'biceps', 'Biceps', 'bb', 0, 0, 'Elbows at your sides. Curl the bar up without swinging and lower slowly.'],
  ['db-curl', 'Dumbbell Curl', 'biceps', 'Biceps', 'db', 0, 0, 'Palms forward, curl the dumbbells up and lower under control.'],
  ['hammer-curl', 'Hammer Curl', 'biceps', 'Biceps and forearms', 'db', 0, 0, 'Palms facing each other. Curl up keeping your elbows still.'],
  ['cable-curl', 'Cable Curl', 'biceps', 'Biceps', 'cable', 0, 0, 'Cable at the lowest setting. Curl the bar up and lower slowly.'],
  ['incline-db-curl', 'Incline Dumbbell Curl', 'biceps', 'Biceps', 'db bench', 0, 0, 'Lie back on an incline bench with arms hanging and curl without moving your elbows forward.'],
  ['preacher-curl', 'Machine Preacher Curl', 'biceps', 'Biceps', 'machine', 0, 0, 'Arms on the pad. Curl up and lower almost to straight.'],
  ['kb-curl', 'Kettlebell Curl', 'biceps', 'Biceps', 'kb', 0, 0, 'Hold the bell by the horns and curl it to your chest.'],
  ['band-curl', 'Banded Curl', 'biceps', 'Biceps', 'band', 0, 0, 'Stand on the band and curl your hands to your shoulders.'],
  // Triceps
  ['triceps-pushdown', 'Cable Triceps Pushdown', 'triceps', 'Triceps', 'cable', 0, 0, 'Elbows pinned to your sides. Push the handle down until your arms are straight and return.'],
  ['skull-crusher', 'Skull Crusher', 'triceps', 'Triceps', 'bb bench', 0, 0, 'Lie on a bench, lower the bar toward your forehead by bending only your elbows, and extend.'],
  ['db-overhead-extension', 'Overhead Dumbbell Triceps Extension', 'triceps', 'Triceps', 'db', 0, 0, 'Hold one dumbbell overhead with both hands, lower it behind your head, and extend.'],
  ['dips', 'Dips', 'triceps', 'Triceps and chest', 'dip', 1, 0, 'Support yourself on the bars, lower until your shoulders are just below your elbows, and press up.'],
  ['close-grip-bench', 'Close-Grip Bench Press', 'triceps', 'Triceps', 'bb bench rack', 1, 0, 'Bench press with hands shoulder width apart and elbows tucked.'],
  ['db-kickback', 'Dumbbell Kickback', 'triceps', 'Triceps', 'db', 0, 0, 'Hinge forward, upper arm parallel to the floor, and straighten your elbow behind you.'],
  ['kb-overhead-extension', 'Kettlebell Triceps Extension', 'triceps', 'Triceps', 'kb', 0, 0, 'Hold the bell overhead by the horns, lower behind your head, and extend.'],
  ['band-pushdown', 'Banded Pushdown', 'triceps', 'Triceps', 'band', 0, 0, 'Anchor the band overhead and push down until your arms are straight.'],
  ['diamond-push-up', 'Diamond Push-Up', 'triceps', 'Triceps', '', 1, 0, 'Push-up with your hands together under your chest and elbows close to your body.'],
  ['chair-dip', 'Chair Dip', 'triceps', 'Triceps', '', 0, 0, 'Hands on the edge of a sturdy chair behind you. Bend your elbows to about 90 degrees and press up.'],
  // Quad isolation
  ['leg-extension', 'Leg Extension', 'quadIso', 'Quads', 'machine', 0, 1, 'Straighten your knees against the pad, squeeze at the top, and lower slowly.'],
  ['heel-elevated-goblet-squat', 'Heel-Elevated Goblet Squat', 'quadIso', 'Quads', 'db', 0, 1, 'Heels on a plate or book, dumbbell at your chest. Squat straight down letting your knees travel forward.'],
  ['wall-sit', 'Wall Sit', 'quadIso', 'Quads', '', 0, 1, 'Back against a wall, thighs parallel to the floor. Hold. The number is seconds.', 1],
  // Hamstring isolation
  ['lying-leg-curl', 'Lying Leg Curl', 'hamIso', 'Hamstrings', 'machine', 0, 1, 'Curl your heels toward your glutes and lower slowly.'],
  ['seated-leg-curl', 'Seated Leg Curl', 'hamIso', 'Hamstrings', 'machine', 0, 1, 'Pull the pad down and back under the seat, then return slowly.'],
  ['band-leg-curl', 'Banded Leg Curl', 'hamIso', 'Hamstrings', 'band', 0, 1, 'Lie face down with the band around your ankles and anchored low. Curl your heels to your glutes.'],
  ['sliding-leg-curl', 'Sliding Leg Curl', 'hamIso', 'Hamstrings', '', 0, 1, 'Lie on your back with heels on a towel on a smooth floor. Lift your hips and slide your heels in and out.'],
  ['nordic-curl', 'Nordic Curl', 'hamIso', 'Hamstrings', '', 0, 1, 'Kneel with your feet anchored and lower your body forward as slowly as you can, then push back up.'],
  // Glutes
  ['hip-thrust', 'Barbell Hip Thrust', 'glute', 'Glutes', 'bb bench', 1, 1, 'Upper back on a bench, bar over your hips. Drive your hips up until your body is level and squeeze.'],
  ['cable-pull-through', 'Cable Pull-Through', 'glute', 'Glutes', 'cable', 0, 1, 'Face away from a low cable, rope between your legs. Hinge back and drive your hips forward.'],
  ['db-hip-thrust', 'Dumbbell Hip Thrust', 'glute', 'Glutes', 'db bench', 1, 1, 'Upper back on a bench, dumbbell on your hips. Drive up and squeeze at the top.'],
  ['db-glute-bridge', 'Dumbbell Glute Bridge', 'glute', 'Glutes', 'db', 0, 1, 'Lie on the floor with a dumbbell on your hips and lift them until your body is straight.'],
  ['glute-bridge', 'Glute Bridge', 'glute', 'Glutes', '', 0, 1, 'Lie on your back with knees bent. Lift your hips, squeeze for a second, and lower.'],
  ['sl-glute-bridge', 'Single-Leg Glute Bridge', 'glute', 'Glutes', '', 0, 1, 'Glute bridge with one leg held in the air. Reps are per side.'],
  // Calves
  ['standing-calf-raise', 'Standing Calf Raise', 'calves', 'Calves', 'machine', 0, 1, 'Rise onto your toes as high as you can, pause, and lower to a full stretch.'],
  ['seated-calf-raise', 'Seated Calf Raise', 'calves', 'Calves', 'machine', 0, 1, 'Knees under the pad. Raise your heels, pause, and lower to a stretch.'],
  ['db-calf-raise', 'Dumbbell Calf Raise', 'calves', 'Calves', 'db', 0, 1, 'Hold dumbbells and rise onto your toes on a step, then lower your heels below it.'],
  ['sl-calf-raise', 'Single-Leg Calf Raise', 'calves', 'Calves', '', 0, 1, 'On one foot on a step, rise up fully and lower to a stretch. Reps are per side.'],
  ['calf-raise', 'Calf Raise', 'calves', 'Calves', '', 0, 1, 'Rise onto your toes, pause for a second, and lower slowly.'],
  // Core
  ['plank', 'Plank', 'core', 'Core', '', 0, 0, 'Forearms on the floor, body in a straight line. Hold without letting your hips sag. The number is seconds.', 1],
  ['hanging-leg-raise', 'Hanging Leg Raise', 'core', 'Core', 'pullup', 0, 0, 'Hang from a bar and raise your legs to hip height or higher without swinging.'],
  ['cable-crunch', 'Cable Crunch', 'core', 'Core', 'cable', 0, 0, 'Kneel under a high cable holding the rope by your head and crunch your ribs toward your hips.'],
  ['dead-bug', 'Dead Bug', 'core', 'Core', '', 0, 0, 'On your back, arms and knees up. Lower the opposite arm and leg while keeping your lower back on the floor. Reps are per side.'],
  ['lying-leg-raise', 'Lying Leg Raise', 'core', 'Core', '', 0, 0, 'On your back, raise straight legs to vertical and lower without arching your back.'],
  ['bicycle-crunch', 'Bicycle Crunch', 'core', 'Core', '', 0, 0, 'Bring the opposite elbow and knee together, alternating sides. Reps are per side.'],
  ['side-plank', 'Side Plank', 'core', 'Core', '', 0, 0, 'On one forearm, body straight from head to feet. Hold each side. The number is seconds.', 1],
  ['russian-twist', 'Russian Twist', 'core', 'Core', '', 0, 0, 'Sit leaning back with feet off the floor and rotate your torso side to side. Reps are per side.'],
  // Core: rigid trunk and body shape (diving, gymnastics)
  ['hollow-hold', 'Hollow Body Hold', 'core', 'Core', '', 0, 0, 'On your back, press your lower back into the floor, lift your shoulders and straight legs a few inches and hold a banana shape. The number is seconds.', 1],
  ['arch-hold', 'Arch Hold', 'core', 'Lower back and glutes', '', 0, 0, 'Face down, lift your arms, chest and straight legs off the floor and hold, squeezing your glutes. The number is seconds.', 1],
  ['v-up', 'V-Up', 'core', 'Core', '', 0, 0, 'From lying flat, lift straight arms and legs together to touch your toes at the top, then lower with control.'],
  ['pike-compression', 'Seated Pike Compression', 'core', 'Hip flexors and core', '', 0, 0, 'Sit with straight legs, hands beside your knees. Lift both heels off the floor by squeezing your thighs to your chest. Hold 2 seconds each rep.'],
  ['pallof-press', 'Pallof Press', 'core', 'Core (anti-rotation)', 'cable', 0, 0, 'Stand side-on to a cable at chest height. Press the handle straight out and hold for 2 seconds without letting it pull you round. Reps are per side.'],
  ['band-pallof-press', 'Banded Pallof Press', 'core', 'Core (anti-rotation)', 'band', 0, 0, 'Band anchored at chest height, stand side-on. Press it straight out and resist the twist. Reps are per side.'],
  ['copenhagen-plank', 'Copenhagen Plank', 'core', 'Groin and obliques', 'bench', 0, 1, 'Side plank with your top foot on a bench and the bottom leg hanging. Hold each side. Protects the groin in kicking and skating sports. The number is seconds.', 1],
  ['farmer-carry', 'Farmer Carry', 'core', 'Grip and core', 'db', 1, 0, 'Hold heavy dumbbells at your sides and walk tall for the time given, without leaning. The number is seconds.', 1],
  // Plyometrics: jump and landing power
  ['cmj-arm-swing', 'Arm-Swing Jump', 'plyo', 'Jump power', '', 1, 1, 'Stand tall, swing your arms back as you dip, then throw them overhead and jump as high as you can. Land softly on both feet and reset each rep. This is the same arm drive as a standing dive takeoff.'],
  ['box-jump', 'Box Jump', 'plyo', 'Jump power', 'bench', 1, 1, 'Jump onto a sturdy box or bench, land softly in a half squat, then step down. Quality over quantity: stop before you slow down.'],
  ['hurdle-step-jump', 'Hurdle-Step Jump', 'plyo', 'Jump power', '', 1, 1, 'Take two walking steps, lift one knee high into a hurdle, land on both feet and jump straight up with arms overhead. Mirrors a running dive approach.'],
  ['drop-landing', 'Drop and Stick Landing', 'plyo', 'Landing control', 'bench', 1, 1, 'Step off a low box and land on both feet in a quiet half squat, knees over toes, and hold for 2 seconds. Teaches safe landings.'],
  ['squat-jump', 'Squat Jump', 'plyo', 'Jump power', '', 1, 1, 'Squat to half depth, pause for a second, then jump as high as you can. Land softly and reset.'],
  ['broad-jump', 'Broad Jump', 'plyo', 'Horizontal power', '', 1, 1, 'Swing your arms and jump forward as far as you can, landing on both feet. Walk back and repeat.'],
  ['lateral-bound', 'Lateral Bound', 'plyo', 'Side-to-side power', '', 1, 1, 'Push off one leg and leap sideways, landing on the other foot and holding for a second. Reps are per side.'],
  ['tuck-jump', 'Tuck Jump', 'plyo', 'Jump power', '', 1, 1, 'Jump straight up and pull your knees to your chest, then land softly. Builds the fast tuck for somersaults.'],
  ['pogo-hops', 'Pogo Hops', 'plyo', 'Ankle stiffness', '', 1, 1, 'Small, quick bounces on the balls of your feet with stiff ankles and almost straight knees. Count each hop.'],
  ['sprint-start', 'Falling Start Sprint', 'plyo', 'Acceleration', '', 1, 1, 'Lean forward until you have to step, then sprint hard for 10 to 20 metres. Walk back to recover. Count each sprint as one rep.'],
  // Rotation power: twisting, throwing, swinging
  ['cable-woodchop', 'Cable Woodchop', 'rotate', 'Rotational power', 'cable', 1, 0, 'Pull the cable from high on one side to low on the other, turning through your hips and chest, arms long. Reps are per side.'],
  ['band-woodchop', 'Banded Woodchop', 'rotate', 'Rotational power', 'band', 1, 0, 'Band anchored high. Pull it down and across your body, pivoting your back foot. Reps are per side.'],
  ['db-woodchop', 'Dumbbell Woodchop', 'rotate', 'Rotational power', 'db', 1, 0, 'Hold one dumbbell with both hands and swing it from outside one hip to above the opposite shoulder, turning your hips. Reps are per side.'],
  ['rotational-lunge', 'Lunge with Twist', 'rotate', 'Rotational control', '', 1, 0, 'Step into a lunge and rotate your chest over your front leg, arms straight out, then return. Reps are per side.'],
  // Shoulder health: overhead, throwing and swimming sports
  ['band-external-rotation', 'Banded External Rotation', 'shoulder', 'Rotator cuff', 'band', 0, 0, 'Elbow tucked at your side bent to 90 degrees. Rotate your hand out against the band and back slowly. Reps are per side.'],
  ['cable-external-rotation', 'Cable External Rotation', 'shoulder', 'Rotator cuff', 'cable', 0, 0, 'Side-on to a cable at elbow height, elbow pinned to your side. Rotate your forearm out and return slowly. Reps are per side.'],
  ['side-lying-er', 'Side-Lying External Rotation', 'shoulder', 'Rotator cuff', 'db', 0, 0, 'Lie on your side with a light dumbbell, top elbow on your hip. Rotate the weight up toward the ceiling and lower slowly. Reps are per side.'],
  ['ytw-raise', 'Y-T-W Raise', 'shoulder', 'Upper back and shoulders', '', 0, 0, 'Face down, thumbs up. Lift your arms into a Y, then a T, then a W, holding each for a second. One round is one rep.'],
  ['scap-pushup', 'Scapular Push-Up', 'shoulder', 'Serratus', '', 0, 0, 'In a straight-arm plank, let your chest sink between your shoulder blades, then push the floor away to spread them. Arms stay straight.'],
  ['wall-slide', 'Wall Slide', 'shoulder', 'Shoulder mobility', '', 0, 0, 'Back and arms flat on a wall, elbows at 90 degrees. Slide your arms up overhead without your back or hands leaving the wall.'],
  // Mobility holds
  ['pike-stretch', 'Pike Stretch', 'mobility', 'Hamstrings', '', 0, 1, 'Sit with straight legs together, flex your feet and fold forward from your hips with a long back. Breathe and sink deeper. The number is seconds.', 1],
  ['pancake-stretch', 'Pancake Stretch', 'mobility', 'Hamstrings and hips', '', 0, 1, 'Sit with straight legs wide, fold forward from your hips with a flat back, walking your hands out. The number is seconds.', 1],
  ['shoulder-dislocate', 'Band Shoulder Pass-Through', 'mobility', 'Shoulder mobility', 'band', 0, 0, 'Hold a band wide with straight arms and pass it from in front of your hips to behind your back and back again. Narrow your grip over time. Count each pass.'],
  ['overhead-reach', 'Wall Overhead Reach', 'mobility', 'Shoulder mobility', '', 0, 0, 'Face a wall, hands on it, walk your hands up and sink your chest toward the wall to open your shoulders and upper back. The number is seconds.', 1],
  ['hip-flexor-stretch', 'Kneeling Hip Flexor Stretch', 'mobility', 'Hip flexors', '', 0, 1, 'Half kneel, squeeze the glute of the back leg and shift forward until you feel the front of that hip stretch. Hold each side. The number is seconds.', 1],
  ['ankle-rock', 'Knee-to-Wall Ankle Rock', 'mobility', 'Ankles', '', 0, 1, 'Foot a few inches from a wall, push your knee forward to touch it without your heel lifting. Rock in and out. Reps are per side.'],
];

export const EXERCISES: Exercise[] = rows.map((r) => ({
  id: r[0],
  name: r[1],
  pattern: r[2],
  muscle: r[3],
  needs: (r[4] ? r[4].split(' ') : []) as Equip[],
  compound: r[5] === 1,
  lower: r[6] === 1,
  how: r[7],
  timed: r[8] === 1,
}));

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  return (
    byId.get(id) ?? {
      id,
      name: 'Unknown exercise',
      pattern: 'core',
      muscle: '',
      needs: [],
      compound: false,
      lower: false,
      how: '',
    }
  );
}

export const EQUIPMENT: { id: Equip; label: string }[] = [
  { id: 'db', label: 'Dumbbells' },
  { id: 'bench', label: 'Bench' },
  { id: 'bb', label: 'Barbell and plates' },
  { id: 'rack', label: 'Squat rack' },
  { id: 'pullup', label: 'Pull-up bar' },
  { id: 'kb', label: 'Kettlebell' },
  { id: 'band', label: 'Resistance bands' },
  { id: 'cable', label: 'Cable machine' },
  { id: 'dip', label: 'Dip bars' },
  { id: 'machine', label: 'Weight machines' },
];

export const ALL_EQUIP: Equip[] = EQUIPMENT.map((e) => e.id);

export const PATTERN_LABEL: Record<Pattern, string> = {
  squat: 'Squat',
  hinge: 'Hip hinge',
  lunge: 'Single leg',
  hpush: 'Chest press',
  vpush: 'Shoulder press',
  hpull: 'Row',
  vpull: 'Pull-down',
  chestIso: 'Chest fly',
  latRaise: 'Side delts',
  rearDelt: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quadIso: 'Quads',
  hamIso: 'Hamstrings',
  glute: 'Glutes',
  calves: 'Calves',
  core: 'Core',
  plyo: 'Jumps and power',
  rotate: 'Rotation power',
  shoulder: 'Shoulder health',
  mobility: 'Mobility',
};
