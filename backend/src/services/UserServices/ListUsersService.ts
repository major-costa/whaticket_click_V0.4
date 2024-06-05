import { Sequelize, Op } from "sequelize";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string | number;
  profile?: string;
  companyId?: number;
}

interface Response {
  users: User[];
  count: number;
  hasMore: boolean;


  onlineCount: number;
  offlineCount: number;
  array_user_on: string[];
  array_user_off: string[];


}

const ListUsersService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId
}: Request): Promise<Response> => {
  const whereCondition = {
    [Op.or]: [
      {
        "$User.name$": Sequelize.where(
          Sequelize.fn("LOWER", Sequelize.col("User.name")),
          "LIKE",
          `%${searchParam.toLowerCase()}%`
        )
      },
      { email: { [Op.like]: `%${searchParam.toLowerCase()}%` } }
    ],
    companyId: {
      [Op.eq]: companyId
    }
  };

  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: users } = await User.findAndCountAll({
    where: whereCondition,


    attributes: ["name", "id", "email", "companyId", "profile", "createdAt", "online", "allTicket"],


    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      { model: Queue, as: "queues", attributes: ["id", "name", "color"] },
      { model: Company, as: "company", attributes: ["id", "name"] }
    ]
  });




  // Inicialize array_user_on e array_user_off como arrays vazios
  let array_user_on: string[] = [];
  let array_user_off: string[] = [];

  for (const user of users) {
    if (user.online) {
      array_user_on.push(user.name); // Adiciona o nome do usuário online ao array array_user_on
    } else {
      array_user_off.push(user.name); // Adiciona o nome do usuário offline ao array array_user_off
    }
  }

  let onlineCount = 0;
  let offlineCount = 0;

  for (const user of users) {
    if (user.online) {
      onlineCount++;
    }else{
      offlineCount++;
    }
  }


  const hasMore = count > offset + users.length;

  return {
    users,
    count,


    onlineCount,
    offlineCount,
    array_user_on,
    array_user_off,
    

    hasMore
  };
};

export default ListUsersService;
