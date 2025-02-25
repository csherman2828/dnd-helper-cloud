import { Stack, StackProps, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, ITable, AttributeType } from 'aws-cdk-lib/aws-dynamodb';

export class DataStack extends Stack {
  public readonly table: ITable;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define the DynamoDB table
    this.table = new Table(this, 'Table', {
      tableName: 'Data',
      partitionKey: { name: 'PK', type: AttributeType.STRING },
      sortKey: { name: 'SK', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
    });

    new CfnOutput(this, 'TableArn', {
      value: this.table.tableArn,
      description: 'The ARN of the DynamoDB table',
      exportName: 'TableArn',
    });
  }
}
