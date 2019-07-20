const { Command, Argument } = require('patron.js');
const { config } = require('../../services/data.js');
const db = require('../../services/database.js');
const number = require('../../utilities/number.js');
const discord = require('../../utilities/discord.js');

class Transfer extends Command {
  constructor() {
    super({
      names: ['transfer', 'sauce', 'donate'],
      groupName: 'economy',
      description: 'Transfer money to any member.',
      args: [
        new Argument({
          name: 'member',
          key: 'member',
          type: 'member',
          example: '"Supa Hot Fire#1337"',
          preconditions: ['no_self']
        }),
        new Argument({
          name: 'transfer',
          key: 'transfer',
          type: 'cash',
          example: '500',
          preconditionOptions: [{ minimum: config.min_transfer }],
          preconditions: ['min', 'cash']
        })
      ]
    });
  }

  async run(msg, args) {
    const fee = args.transfer * config.transaction_fee;
    const received = args.transfer - fee;
    const res = db.add_cash(msg.author.id, msg.channel.guild.id, -args.transfer);

    db.add_cash(args.member.id, msg.channel.guild.id, received);

    const prefix = `${discord.tag(msg.author).boldified}, `;

    return discord.create_msg(msg.channel, `${prefix}You have successfully transfered \
${number.format(received)} to ${discord.tag(args.member.user)} with a transaction fee of \
${number.format(fee)}. Balance: ${number.format(res.cash, true)}.`);
  }
}

module.exports = new Transfer();
