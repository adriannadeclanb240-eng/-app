// 默认的二级分类体系（一级大类 → 二级小类）
// 首次启动时会写入数据库；之后可在界面里自行增删改

export interface CategorySeed {
  name: string
  children: string[]
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  { name: '餐饮', children: ['早餐', '午餐', '晚餐', '零食', '饮料', '外卖', '聚餐', '其他'] },
  { name: '交通', children: ['公交', '地铁', '打车', '加油', '停车', '火车/飞机', '车辆保养', '其他'] },
  { name: '购物', children: ['服装', '日用品', '数码电子', '美妆护肤', '家居用品', '书籍', '其他'] },
  { name: '居住', children: ['房租', '水电费', '燃气费', '物业费', '维修', '装修', '其他'] },
  { name: '娱乐', children: ['电影', '游戏', '旅游', '运动健身', 'KTV/聚会', '会员订阅', '其他'] },
  { name: '医疗健康', children: ['挂号', '药品', '体检', '治疗', '保险', '其他'] },
  { name: '教育', children: ['学费', '培训课程', '书籍资料', '文具', '考试报名', '其他'] },
  { name: '人情往来', children: ['礼物', '红包', '请客', '婚礼/随礼', '捐款', '其他'] },
  { name: '通讯', children: ['话费', '流量', '宽带', '其他'] },
  { name: '其他', children: ['临时补充'] }
]

// 收入分类
export const DEFAULT_INCOME_CATEGORIES: CategorySeed[] = [
  { name: '工资', children: ['月薪', '奖金', '其他'] },
  { name: '理财', children: ['利息', '投资收益', '其他'] },
  { name: '红包', children: ['收红包', '其他'] },
  { name: '兼职', children: ['兼职收入', '其他'] },
  { name: '其他收入', children: ['其他'] }
]
