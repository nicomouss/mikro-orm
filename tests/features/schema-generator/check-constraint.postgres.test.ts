import { Check, Entity, EntitySchema, MikroORM, PrimaryKey, Property } from '@mikro-orm/core';
import { initORMPostgreSql } from '../../bootstrap';

@Entity()
@Check<FooEntity>({ expression: columns => `${columns.price} >= 0` })
export class FooEntity {

  @PrimaryKey()
  id!: number;

  @Property()
  price!: number;

  @Property()
  @Check<FooEntity>({ expression: columns => `${columns.price2} >= 0` })
  price2!: number;

  @Property({ check: 'price3 >= 0' })
  price3!: number;

}

describe('check constraint [postgres]', () => {

  test('check constraint is generated for decorator [postgres]', async () => {
    const orm = await MikroORM.init({
      entities: [FooEntity],
      dbName: `mikro_orm_test`,
      type: 'postgresql',
    });

    const diff = await orm.schema.getCreateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-decorator');

    await orm.close();
  });

  test('check constraint diff [postgres]', async () => {
    const orm = await initORMPostgreSql();
    const meta = orm.getMetadata();
    const generator = orm.schema;
    await generator.updateSchema();

    const newTableMeta = new EntitySchema({
      properties: {
        id: {
          primary: true,
          name: 'id',
          type: 'number',
          fieldName: 'id',
          columnType: 'int',
        },
        price: {
          type: 'number',
          name: 'price',
          fieldName: 'price',
          columnType: 'int',
        },
      },
      name: 'NewTable',
      tableName: 'new_table',
      checks: [
        { name: 'foo', expression: 'price >= 0' },
      ],
    }).init().meta;
    meta.set('NewTable', newTableMeta);

    let diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-diff-1');
    await generator.execute(diff);

    // Update a check expression
    newTableMeta.checks = [{ name: 'foo', expression: 'price > 0' }];
    diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-diff-2');
    await generator.execute(diff);

    // Remove a check constraint
    newTableMeta.checks = [];
    diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-diff-3');
    await generator.execute(diff);

    // Add new check
    newTableMeta.checks = [{ name: 'bar', expression: 'price > 0' }];
    diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-diff-4');
    await generator.execute(diff);

    // Skip existing check
    diff = await orm.schema.getUpdateSchemaSQL({ wrap: false });
    expect(diff).toMatchSnapshot('postgres-check-constraint-diff-5');
    await generator.execute(diff);

    await orm.close();
  });

});
