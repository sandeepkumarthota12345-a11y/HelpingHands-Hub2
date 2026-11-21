// Sample data for the demo. Used by both the server and the browser-only fallback.
export const sampleNames=[['Jordan Lee','jordan.lee@example.com'],['Samira Patel','samira.patel@example.com'],['Noah Brooks','noah.brooks@example.com'],['Maya Chen','maya.chen@example.com'],['Riley Thompson','riley.thompson@example.com'],['Ava Williams','ava.williams@example.com'],['Ethan Rivera','ethan.rivera@example.com'],['Priya Shah','priya.shah@example.com'],['Lucas Martin','lucas.martin@example.com'],['Zoe Kim','zoe.kim@example.com'],['Amir Hassan','amir.hassan@example.com'],['Isabella Garcia','isabella.garcia@example.com'],['Theo Nguyen','theo.nguyen@example.com'],['Grace Wilson','grace.wilson@example.com'],['Mateo Davis','mateo.davis@example.com'],['Nina Kapoor','nina.kapoor@example.com'],['Owen Clarke','owen.clarke@example.com'],['Layla Robinson','layla.robinson@example.com'],['Finn Cooper','finn.cooper@example.com'],['Elena Torres','elena.torres@example.com'],['Kai Bennett','kai.bennett@example.com'],['Sofia Reed','sofia.reed@example.com'],['Arjun Mehta','arjun.mehta@example.com'],['Chloe Baker','chloe.baker@example.com'],['Gabriel Flores','gabriel.flores@example.com'],['Harper Evans','harper.evans@example.com'],['Leo Murphy','leo.murphy@example.com'],['Anika Das','anika.das@example.com'],['Miles Foster','miles.foster@example.com'],['Sara Ahmed','sara.ahmed@example.com'],['Dylan Price','dylan.price@example.com'],['Mei Lin','mei.lin@example.com'],['Aiden Scott','aiden.scott@example.com'],['Fatima Ali','fatima.ali@example.com'],['Ruby James','ruby.james@example.com']];
export const templates=[
      ['tree','Urban Tree Plantation Drive','GreenEarth Brigade','Environment','2026-11-21','Cedar Grove Park','Northside',4,'','Plant 300 native saplings and make our neighborhood cooler, greener, and healthier.','Prepare planting beds, place young native trees, and add protective mulch. Tools and a short orientation are provided.',['Morning|8:00 AM – 12:00 PM','Afternoon|1:00 PM – 5:00 PM','Evening|5:30 PM – 9:30 PM'],'mint'],
      ['pantry','Community Pantry Packing Day','City Food Bank','Health','2026-11-22','Central Community Kitchen','Downtown',3.5,'','Pack 500 fresh-food boxes for families across the city.','Sort donated produce, pack pantry boxes, and prepare deliveries for local families.',['Morning|8:30 AM – 12:00 PM','Afternoon|12:30 PM – 4:00 PM','Evening|4:30 PM – 8:00 PM'],'peach'],
      ['reading','Weekend Reading Buddies','YouthMinds Tutoring','Education','2026-11-22','Maple Street Learning Center','East End',2.5,'','Give 24 young readers a little extra confidence and attention.','Read together, play word games, and encourage elementary-age students. Activity ideas are provided.',['Morning|9:00 AM – 11:30 AM','Afternoon|1:00 PM – 3:30 PM'],'purple'],
      ['paws','Paws & People Adoption Open House','PawsRescue Shelter','Animal Welfare','2026-11-28','PawsRescue Community Shelter','Westside',3,'','Help 15 rescue pets meet people who could become their forever families.','Welcome visitors, share each pet’s story, and help keep the adoption space calm.',['Morning|9:00 AM – 12:00 PM','Afternoon|1:00 PM – 4:00 PM'],'rose'],
      ['river','Riverside Clean-up & Nature Walk','GreenEarth Brigade','Environment','2026-11-29','Willowbend River Trail','Riverside',3,'','Clear litter from two miles of riverbank and protect local wildlife.','Join a guided litter pick along the river. Gloves, bags, water, and a safety briefing are included.',['Morning|8:00 AM – 11:00 AM','Afternoon|12:00 PM – 3:00 PM','Evening|3:30 PM – 6:30 PM'],'mint'],
      ['wellness','Neighborhood Wellness Kit Assembly','City Food Bank','Health','2026-12-05','Central Community Kitchen','Downtown',3,'','Put together 200 practical care kits for neighborhood outreach teams.','Assemble personal-care kits, add welcome notes, and organize supplies for outreach.',['Morning|9:00 AM – 12:00 PM','Afternoon|1:00 PM – 4:00 PM','Evening|4:30 PM – 7:30 PM'],'peach'],
      ['homework','Homework Club: Math & More','YouthMinds Tutoring','Education','2026-12-06','Maple Street Learning Center','East End',2,'','Make after-school learning welcoming for 18 middle-school students.','Support students with homework, study habits, and confidence. Learning materials are supplied.',['Morning|9:30 AM – 11:30 AM','Afternoon|1:00 PM – 3:00 PM'],'purple'],
      ['shelter','Shelter Enrichment Morning','PawsRescue Shelter','Animal Welfare','2026-12-12','PawsRescue Community Shelter','Westside',2.5,'','Bring comfort and play to shelter pets waiting for their homes.','Prepare enrichment toys, spend time with cats, or take a supervised dog walk.',['Morning|9:00 AM – 11:30 AM','Afternoon|12:30 PM – 3:00 PM'],'rose']
    ];

export const USER = { name: 'Alex Morgan', email: 'alex.morgan@example.com', phone: '(555) 014-2810' };
export const CAUSES = ['Environment', 'Education', 'Health', 'Animal Welfare'];

// Attendance is only pre-filled for drives on or before this date.
const SEED_TODAY = '2026-11-21';

export function buildSeed() {
  const drives = templates.map((t) => ({
    id: t[0], title: t[1], org: t[2], category: t[3], date: t[4], place: t[5],
    area: t[6], hours: t[7], goal: t[9], description: t[10], theme: t[12],
    shifts: t[11].map((s) => {
      const [period, time] = s.split('|');
      return { id: `${t[0]}-${period.toLowerCase()}`, period, time, capacity: 10, volunteers: [] };
    }),
  }));
  let ix = 0;
  drives.forEach((d, di) =>
    d.shifts.forEach((s, si) => {
      const n = di === 0 && si === 0 ? 6 : 2;
      for (let k = 0; k < n && ix < sampleNames.length; k++, ix++) {
        const [name, email] = sampleNames[ix];
        s.volunteers.push({
          name, email,
          phone: `(555) 01${String(ix + 10).padStart(2, '0')}-2840`,
          attended: d.date <= SEED_TODAY && ix % 3 === 0,
        });
      }
    })
  );
  return {
    drives,
    interests: ['Environment', 'Education'],
    past: [{ id: 'old-park', title: 'Neighborhood Park Restoration', date: '2026-11-14', hours: 4 }],
  };
}
