const bcrypt = require("bcrypt");

async function test() {
  const password = "12345678";

  const hash = await bcrypt.hash(password, 10);

  console.log("Hash:", hash);

  const result = await bcrypt.compare(password, hash);

  console.log("Match:", result);
}

test();