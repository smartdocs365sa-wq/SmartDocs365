const mongoose = require("mongoose");

main().catch((err) => console.log(err.message));
async function main() {
  await mongoose
    .connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to Database");
    })
    .catch((error) => console.error(error.message));
}
